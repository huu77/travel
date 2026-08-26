import {
  BookingPassengerSnapshot,
  FlightBookingSnapshot,
  Gender,
  PassengerTitle,
  ProviderHoldOrderResponse,
  type HoldOrderInput,
  type HoldOrderResult,
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

const checkUser = async (userId: string): Promise<Partial<User>> => {
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
    throw new GraphQLError('Provider not found', {
      extensions: { code: 'NOTFOUND', http: { status: 400 } },
    });
  }

  return provider;
};

const loadPassengersInSystem = async ({
  passengerIds,
}: {
  passengerIds: string[];
}): Promise<Partial<Passenger>[]> => {
  const passengers: Partial<Passenger>[] = await prisma.passenger.findMany({
    where: {
      passengerId: {
        in: passengerIds,
      },
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

  if (passengerIds.length !== passengers.length) {
    const [_, passengerIdsNotExits] = partition(
      passengers,
      ({ passengerId }: { passengerId: string }) => passengerIds.includes(passengerId),
    );

    console.error(
      `[HoldOrder] Have passenger don't register before hold orde`,
      passengerIdsNotExits,
    );
    throw new GraphQLError(`[HoldOrder] Have passenger don't register before hold order`, {
      extensions: { code: '', http: { status: 400 } },
    });
  }

  return passengers;
};

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

const saveBooking = async ({
  userId,
  provider,
  providerBookingId,
  totalAmount,
  currency,
  passengers,
  customFields,
}: SaveBookingParams) => {
  return await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.create({
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
      await tx.bookingPassenger.create({
        data: {
          bookingId: booking.bookingId,
          passengerId: passengers[i]!.passengerId!,
          customFields: customFields.passengerSnapshots[i] as unknown as Prisma.InputJsonValue,
        },
      });
    }

    return booking;
  });
};

export const createHoldOrderViaProvider = async (
  userId: string,
  input: HoldOrderInput,
): Promise<HoldOrderResult> => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎟️ [FlightHoldOrder] Bắt đầu quy trình tạo đơn Giữ Chỗ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📥 Tham số đầu vào:', JSON.stringify(input, null, 2));

  const provider = await checkProvider(input.providerId);
  const providerCode = provider.code.trim().toLowerCase();
  const providerRegister = FlightProviderRegistry.get(providerCode);

  const [user, offer] = await Promise.all([
    checkUser(userId),
    providerRegister.getOfferDetails(input.offerId),
  ]);

  console.log('[HoldOrder] user', JSON.stringify(user, null, 2));
  console.log('[HoldOrder] offer', JSON.stringify(offer, null, 2));

  const passengers = await loadPassengersInSystem({
    passengerIds: input.passengerIds,
  });

  let holdOrderResponse: ProviderHoldOrderResponse | null = null;

  try {
    holdOrderResponse = await providerRegister.createHoldOrder({
      offerId: input.offerId,
      passengers,
    });

    const flightSnapshot = buildFlightSnapshot(input.offerId, holdOrderResponse);
    const passengerSnapshots = buildPassengerSnapshots(passengers, offer.passengers || []);
    const customFields = { flightSnapshot, passengerSnapshots };

    const createdBooking = await saveBooking({
      userId,
      provider: providerCode,
      providerBookingId: holdOrderResponse.orderId,
      totalAmount: holdOrderResponse.totalAmount,
      currency: holdOrderResponse.currency,
      passengers,
      customFields,
    });

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
  } catch (error: any) {
    if (holdOrderResponse?.orderId && providerRegister.cancelOrder) {
      console.warn(
        `[Saga Rollback] Lỗi lưu DB sau khi giữ chỗ. Đang tự động hủy đơn ${holdOrderResponse.orderId} trên Provider...`,
      );

      try {
        await providerRegister.cancelOrder(holdOrderResponse.orderId);
        console.log(
          `[Saga Rollback] Đã hủy thành công đơn ${holdOrderResponse.orderId} trên Provider!`,
        );
      } catch (cancelError: any) {
        console.error(
          `[Saga Rollback CRITICAL] Không thể tự động hủy đơn ${holdOrderResponse.orderId}:`,
          cancelError.message,
        );
      }
    }

    throw error;
  }
};

export default createHoldOrderViaProvider;
