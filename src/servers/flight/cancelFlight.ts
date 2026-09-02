import { BookingStatus } from '@/generated/prisma/enums.js';
import { prisma } from '@/prisma.js';
import { FlightProviderRegistry } from '@/shared/provider.js';
import { GraphQLError } from 'graphql';

const getFlightBooking = async (bookingId: string, userId: string) => {
  const flightBooking = await prisma.booking.findFirst({
    where: {
      userId,
      bookingId: bookingId,
      deletedAt: null,
    },
    select: {
      bookingId: true,
      status: true,
      provider: true,
      providerBookingId: true,
      providerRef: {
        select: {
          providerId: true,
          code: true,
        },
      },
      customFields: true,
    },
  });

  if (!flightBooking) {
    throw new GraphQLError('Không tìm thấy đặt vé', {
      extensions: {
        code: 'NOT_FOUND',
        http: { status: 404 },
      },
    });
  }

  if (flightBooking.status === BookingStatus.CANCELLED) {
    return flightBooking;
  }

  if (flightBooking.status === BookingStatus.FAILED) {
    throw new GraphQLError('Đơn đặt vé này đã ở trạng thái thất bại, không thể thực hiện hủy!', {
      extensions: {
        code: 'BAD_USER_INPUT',
        http: { status: 400 },
      },
    });
  }

  if (!flightBooking.providerBookingId) {
    throw new GraphQLError('Booking này không có mã đơn hợp lệ từ Hãng bay để hủy!', {
      extensions: {
        code: 'BAD_USER_INPUT',
        http: { status: 400 },
      },
    });
  }

  return flightBooking;
};

async function cancelFlightBookingViaProvider(bookingId: string, userId: string): Promise<boolean> {
  const flightBooking = await getFlightBooking(bookingId, userId);
  console.log('[CancelFlight] - flightBooking ', JSON.stringify(flightBooking, null, 2));

  if (flightBooking.status === BookingStatus.CANCELLED) {
    console.log(`[CancelFlight]: Booking ${bookingId} đã ở trạng thái CANCELLED từ trước.`);
    return true;
  }

  const providerCode = flightBooking.providerRef?.code || flightBooking.provider;
  const providerRegister = FlightProviderRegistry.get(providerCode);
  if (!providerRegister) {
    throw new GraphQLError('Provider không tồn tại', {
      extensions: {
        code: 'NOT_FOUND',
        http: { status: 404 },
      },
    });
  }

  await providerRegister.cancelOrder(flightBooking.providerBookingId!);

  const currentCustomFields = (flightBooking.customFields as Record<string, unknown>) || {};
  await prisma.booking.update({
    where: {
      bookingId: bookingId,
    },
    data: {
      status: BookingStatus.CANCELLED,
      customFields: {
        ...currentCustomFields,
        cancelledBy: userId,
        cancelledAt: new Date().toISOString(),
      },
    },
  });

  console.log(`[CancelFlight]: Updated booking ${bookingId} to ${BookingStatus.CANCELLED}`);
  return true;
}

export default cancelFlightBookingViaProvider;
