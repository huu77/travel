import {
  Gender,
  PassengerTitle,
  type HoldOrderInput,
  type HoldOrderResult,
  type BookingPassengerSnapshot,
  type FlightBookingSnapshot,
  type ProviderHoldOrderResponse,
  OfferPassengerInput,
} from '@/types/booking.js';
import '@/servers/duffel/index.js';
import { prisma } from '@/prisma.js';
import { GraphQLError } from 'graphql';
import {
  BookingStatus,
  Passenger,
  PassengerType,
  Prisma,
  User,
} from '@/generated/prisma/client.js';
import { FlightProviderRegistry } from '@/shared/provider.js';
import partition from 'lodash/partition.js';
import omitBy from 'lodash/omitBy.js';
import isUndefined from 'lodash/isUndefined.js';

const checkUser = async (userId: string): Promise<Pick<User, 'userId' | 'email' | 'phone'>> => {
  const user = await prisma.user.findFirst({
    where: {
      userId,
      deletedAt: null,
    },
    select: {
      userId: true,
      email: true,
      phone: true,
    },
  });

  if (!user) {
    console.error(`❌ [HoldOrder] Không tìm thấy User ID: ${userId}`);
    throw new GraphQLError('[HoldOrder] User not found', {
      extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } },
    });
  }

  return user;
};

const checkProvider = async (providerId: string) => {
  const provider = await prisma.provider.findFirst({
    where: {
      providerId,
      deletedAt: null,
    },
    select: {
      providerId: true,
      code: true,
    },
  });

  if (!provider) {
    console.error(`❌ [HoldOrder] Không tìm thấy Provider: ${providerId}`);
    throw new GraphQLError('Provider not found', {
      extensions: { code: 'NOT_FOUND', http: { status: 400 } },
    });
  }

  return provider;
};

async function loadPassengerByIds(
  {
    passengerIds,
    userId,
  }: {
    passengerIds: string[];
    userId?: string;
  },
  txt: Prisma.TransactionClient,
) {
  const uniquePassengerIds = [...new Set(passengerIds)];

  const passengers = await txt.passenger.findMany({
    where: {
      passengerId: {
        in: uniquePassengerIds,
      },
      ...(userId ? { userId } : {}),
      deletedAt: null,
    },
    select: {
      passengerId: true,
      type: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      gender: true,
      nationality: true,
      passportNumber: true,
      passportCountry: true,
      passportExpiryDate: true,
    },
  });

  if (uniquePassengerIds.length !== passengers.length) {
    const foundIds = new Set(passengers.map((p) => p.passengerId));
    const missingPassengerIds = uniquePassengerIds.filter((id) => !foundIds.has(id));

    console.error(
      `❌ [HoldOrder] Phát hiện hành khách chưa đăng ký hoặc không thuộc quyền sở hữu:`,
      missingPassengerIds,
    );

    throw new GraphQLError(`[HoldOrder] Have passenger don't register before hold order`, {
      extensions: {
        code: 'PASSENGER_NOT_FOUND',
        http: { status: 400 },
        missingPassengerIds,
      },
    });
  }

  return passengers;
}

export async function loadPassengerByNewData(
  offerPassengers: OfferPassengerInput[],
  txt: Prisma.TransactionClient,
): Promise<Passenger[]> {
  if (!offerPassengers || offerPassengers.length === 0) {
    return [];
  }

  const indexedPassengers = offerPassengers.map((p, index) => ({
    index,
    passenger: p,
    passengerId: p.passengerId || (p as any).passengerid,
  }));

  const [passengersWithId, passengersWithoutId] = partition(
    indexedPassengers,
    (item) => item.passengerId,
  );

  const results: Passenger[] = new Array(offerPassengers.length);

  if (passengersWithId.length > 0) {
    const updatePromises = passengersWithId.map(async ({ index, passenger, passengerId }) => {
      const rawUpdateData: Record<string, any> = {
        firstName: passenger.firstName,
        lastName: passenger.lastName,
        type: passenger.type || PassengerType.ADULT,
        gender: passenger.gender,
        nationality: passenger.nationality,
        passportNumber: passenger.passportNumber,
        passportCountry: passenger.passportCountry,
        passportExpiryDate: passenger.passportExpiryDate
          ? new Date(passenger.passportExpiryDate)
          : undefined,
        dateOfBirth: passenger.dateOfBirth ? new Date(passenger.dateOfBirth) : undefined,
      };

      const updateData = omitBy(rawUpdateData, isUndefined) as Prisma.PassengerUpdateInput;

      const updated = await txt.passenger.update({
        where: {
          passengerId: passengerId!,
        },
        data: updateData,
      });
      results[index] = updated;
    });
    await Promise.all(updatePromises);
  }

  if (passengersWithoutId.length > 0) {
    const createData = passengersWithoutId.map(({ passenger }) => ({
      userId: passenger.userId,
      firstName: passenger.firstName,
      lastName: passenger.lastName,
      type: passenger.type || PassengerType.ADULT,
      gender: passenger.gender ?? null,
      nationality: passenger.nationality ?? null,
      passportNumber: passenger.passportNumber ?? null,
      passportCountry: passenger.passportCountry || 'VN',
      passportExpiryDate: passenger.passportExpiryDate
        ? new Date(passenger.passportExpiryDate)
        : null,
      dateOfBirth: passenger.dateOfBirth ? new Date(passenger.dateOfBirth) : new Date('1992-03-14'),
    }));

    const createdPassengers = await txt.passenger.createManyAndReturn({
      data: createData,
    });

    passengersWithoutId.forEach(({ index }, i) => {
      results[index] = createdPassengers[i]!;
    });
  }

  return results;
}

async function loadPassengersInSystem(
  {
    passengerIds = [],
    userId,
    offerPassengers = [],
  }: {
    passengerIds?: string[];
    userId?: string;
    offerPassengers?: OfferPassengerInput[];
  },
  txt: Prisma.TransactionClient,
): Promise<Partial<Passenger>[]> {
  let passengers: Partial<Passenger>[] = [];

  const shouldLoadPassengerByNewData = offerPassengers.length > 0;
  if (shouldLoadPassengerByNewData) {
    passengers = await loadPassengerByNewData(offerPassengers, txt);
  }

  const shouldLoadPassengerById =
    passengerIds.length > 0 && offerPassengers.length === 0 && Boolean(userId);
  if (shouldLoadPassengerById) {
    passengers = await loadPassengerByIds(
      {
        passengerIds,
        ...(userId ? { userId } : {}),
      },
      txt,
    );
  }

  return passengers;
}

const buildFlightSnapshot = (
  offerId: string,
  response: ProviderHoldOrderResponse,
): FlightBookingSnapshot => ({
  bookingReference: response.bookingReference,
  paymentRequiredBy: response.paymentRequiredBy,
  duffelOfferId: offerId,
  carrier: response.carrier,
  slices: response.slices,
  conditions: response.conditions,
});

const buildPassengerSnapshots = (
  dbPassengers: Partial<Passenger>[],
  offerPassengers: any[],
): BookingPassengerSnapshot[] => {
  return dbPassengers.map((p, index) => {
    const isFemale = p.gender?.toLowerCase() === Gender.FEMALE;

    return {
      passengerId: p.passengerId || '',
      duffelPassengerId: offerPassengers[index]?.id ?? null,
      type: p.type || PassengerType.ADULT,
      title: isFemale ? PassengerTitle.MS : PassengerTitle.MR,
      firstName: p.firstName || '',
      lastName: p.lastName || '',
      dateOfBirth: p.dateOfBirth
        ? p.dateOfBirth instanceof Date
          ? p.dateOfBirth.toISOString().split('T')[0]!
          : String(p.dateOfBirth).split('T')[0]!
        : null,
      gender: p.gender ?? null,
      nationality: p.nationality ?? null,
      passportNumber: p.passportNumber ?? null,
      passportCountry: p.passportCountry ?? null,
      passportExpiryDate: p.passportExpiryDate
        ? p.passportExpiryDate instanceof Date
          ? p.passportExpiryDate.toISOString().split('T')[0]!
          : String(p.passportExpiryDate).split('T')[0]!
        : null,
    };
  });
};

interface SaveBookingParams {
  userId: string;
  provider: string;
  providerBookingId: string;
  totalAmount: string;
  currency: string;
  passengers: Partial<Passenger>[];
  customFields: {
    flightSnapshot: FlightBookingSnapshot;
    passengerSnapshots: BookingPassengerSnapshot[];
  };
}

const saveBooking = async (
  {
    userId,
    provider,
    providerBookingId,
    totalAmount,
    currency,
    passengers,
    customFields,
  }: SaveBookingParams,
  txt: Prisma.TransactionClient,
) => {
  const booking = await txt.booking.create({
    data: {
      userId,
      provider,
      providerBookingId,
      status: BookingStatus.PENDING,
      totalAmount: new Prisma.Decimal(totalAmount),
      currency,
      customFields: customFields as unknown as Prisma.InputJsonValue,
    },
  });

  for (let i = 0; i < passengers.length; i++) {
    await txt.bookingPassenger.create({
      data: {
        bookingId: booking.bookingId,
        passengerId: passengers[i]!.passengerId!,
        customFields: customFields.passengerSnapshots[i] as unknown as Prisma.InputJsonValue,
      },
    });
  }

  return booking;
};

export const createHoldOrderViaProvider = async (
  userId: string,
  input: HoldOrderInput,
): Promise<HoldOrderResult> => {
  console.time('⏱️ [FlightHoldOrder] Thời gian thực thi');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(
    `🎟️ [FlightHoldOrder] Bắt đầu quy trình tạo đơn Giữ Chỗ [Offer ID: ${input.offerId}]`,
  );
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📥 [Bước 1/5] Tham số đầu vào:', {
    userId,
    provider: input.providerId || 'duffel (default)',
    offerId: input.offerId,
    passengerCount: (input.passengerIds?.length || 0) + (input.offerPassengers?.length || 0),
  });

  const provider = await checkProvider(input.providerId);
  const providerCode = provider.code.trim().toLowerCase();
  const providerRegister = FlightProviderRegistry.get(providerCode);
  console.log(`🔌 [Bước 2/5] Đã kết nối Provider: [${providerCode.toUpperCase()}]`);

  console.log(
    `🔍 [Bước 2/5] Đang kiểm tra thông tin User và Offer [Offer ID: ${input.offerId}]...`,
  );
  const [user, offer] = await Promise.all([
    checkUser(userId),
    providerRegister.getOfferDetails(input.offerId),
  ]);

  console.log(`👤 [Bước 2/5] Người đặt vé: ${user.email} (Phone: ${user.phone || 'N/A'})`);
  console.log(
    `✈️ [Bước 2/5] Vé hợp lệ! Hãng: ${offer.owner?.name || 'Airline'} | Tổng tiền: ${offer.total_amount} ${offer.total_currency} | Hạn giữ giá: ${offer.expires_at}`,
  );

  let holdOrderResponse: ProviderHoldOrderResponse | null = null;

  try {
    const result = await prisma.$transaction(async (txt) => {
      console.log(
        `👥 [Bước 3/5] [Offer ID: ${input.offerId}] Đang tải & xác thực danh bạ hành khách trong CSDL...`,
      );
      const passengers = await loadPassengersInSystem(
        {
          passengerIds: input.passengerIds || [],
          userId,
          offerPassengers: input.offerPassengers || [],
        },
        txt,
      );

      console.log(
        `✅ [Bước 3/5] [Offer ID: ${input.offerId}] Xác thực thành công ${passengers.length} hành khách:`,
        passengers
          .map((p) => `${p.firstName} ${p.lastName} (${p.passportNumber || 'No Passport'})`)
          .join(', '),
      );

      console.log(
        `🚀 [Bước 4/5] [Offer ID: ${input.offerId}] Gửi yêu cầu giữ chỗ sang [${providerCode.toUpperCase()}] API...`,
      );
      console.time('⏱️ [FlightHoldOrder] Provider giữ chỗ');
      holdOrderResponse = await providerRegister.createHoldOrder({
        offerId: input.offerId,
        passengers,
      });
      console.timeEnd('⏱️ [FlightHoldOrder] Provider giữ chỗ');
      console.log(
        `✅ [Bước 4/5] [Offer ID: ${input.offerId}] Mã PNR: ${holdOrderResponse.bookingReference} | Order ID: ${holdOrderResponse.orderId}`,
      );

      console.log(
        `📸 [Bước 5/5] [Offer ID: ${input.offerId}] Đóng gói Snapshot chuyến bay & hành khách bất biến...`,
      );
      const flightSnapshot = buildFlightSnapshot(input.offerId, holdOrderResponse);
      const passengerSnapshots = buildPassengerSnapshots(passengers, offer.passengers || []);
      const customFields = { flightSnapshot, passengerSnapshots };

      console.log(
        `💾 [Bước 5/5] [Offer ID: ${input.offerId}] Lưu Booking & BookingPassengers vào PostgreSQL (Prisma $transaction)...`,
      );
      const createdBooking = await saveBooking(
        {
          userId,
          provider: providerCode,
          providerBookingId: holdOrderResponse.orderId,
          totalAmount: holdOrderResponse.totalAmount,
          currency: holdOrderResponse.currency,
          passengers,
          customFields,
        },
        txt,
      );

      console.log('\n🎉 ====================================================');
      console.log(
        `🎉 [FlightHoldOrder] TẠO ĐƠN GIỮ CHỖ HOÀN TẤT THÀNH CÔNG! [Offer ID: ${input.offerId}]`,
      );
      console.log('====================================================');
      console.timeEnd('⏱️ [FlightHoldOrder] Thời gian thực thi');
      console.log(`🎫 Offer ID: ${input.offerId}`);
      console.log(`📦 Booking ID (PostgreSQL): ${createdBooking.bookingId}`);
      console.log(`🔖 Mã PNR Hãng bay (Booking Reference): ${holdOrderResponse.bookingReference}`);
      console.log(
        `⏳ Hạn thanh toán (Payment Required By): ${holdOrderResponse.paymentRequiredBy || 'N/A'}`,
      );
      console.log(`💰 Tổng tiền: ${createdBooking.totalAmount} ${createdBooking.currency}`);
      console.log(`📊 Trạng thái đơn: ${createdBooking.status}`);
      console.log('====================================================\n');

      return {
        bookingId: createdBooking.bookingId,
        userId: createdBooking.userId,
        provider: createdBooking.provider,
        providerBookingId: holdOrderResponse.orderId,
        bookingReference: holdOrderResponse.bookingReference,
        paymentRequiredBy: holdOrderResponse.paymentRequiredBy,
        status: createdBooking.status,
        totalAmount: createdBooking.totalAmount.toString(),
        currency: createdBooking.currency,
        carrier: holdOrderResponse.carrier,
        slices: holdOrderResponse.slices,
        passengers: passengerSnapshots,
        createdAt: createdBooking.createdAt.toISOString(),
      };
    });

    return result;
  } catch (error: any) {
    console.error('\n❌ ====================================================');
    console.error(
      `❌ [FlightHoldOrder Error] XẢY RA LỖI TRONG QUY TRÌNH GIỮ CHỖ [Offer ID: ${input.offerId}]`,
    );
    console.error('====================================================');
    console.timeEnd('⏱️ [FlightHoldOrder] Thời gian thực thi');
    console.error(`🔴 Offer ID: ${input.offerId} | Thông điệp lỗi: ${error.message}`);

    const currentResponse = holdOrderResponse as ProviderHoldOrderResponse | null;
    if (currentResponse?.orderId && providerRegister.cancelOrder) {
      console.warn(
        `⚠️ [Saga Rollback] [Offer ID: ${input.offerId}] Lỗi lưu DB sau khi đã giữ chỗ. Đang tự động hủy đơn ${currentResponse.orderId} trên Provider...`,
      );

      try {
        await providerRegister.cancelOrder(currentResponse.orderId);
        console.log(
          `✅ [Saga Rollback] [Offer ID: ${input.offerId}] Đã hủy thành công đơn ${currentResponse.orderId} trên Provider! Không để lại vé rác.`,
        );
      } catch (cancelError: any) {
        console.error(
          `🚨 [Saga Rollback CRITICAL] [Offer ID: ${input.offerId}] Không thể tự động hủy đơn ${currentResponse.orderId}:`,
          cancelError.message,
        );
      }
    }
    console.error('====================================================\n');

    throw error;
  }
};

export default createHoldOrderViaProvider;
