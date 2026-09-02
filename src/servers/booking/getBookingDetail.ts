import { prisma } from '@/prisma.js';
import { GraphQLError } from 'graphql';

export interface BookingUserDetail {
  userId: string;
  email: string;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

export interface BookingDetailResult {
  bookingId: string;
  userId: string;
  user?: BookingUserDetail | null;
  provider: string;
  providerBookingId?: string | null;
  bookingReference: string;
  paymentRequiredBy?: string | null;
  status: string;
  totalAmount: string;
  currency: string;
  carrier?: any;
  slices: any[];
  passengers: any[];
  conditions?: any;
  createdAt: string;
  updatedAt: string;
}

export async function getBookingDetail(
  bookingId: string,
  userId?: string,
): Promise<BookingDetailResult> {
  const booking = await prisma.booking.findFirst({
    where: {
      bookingId,
      deletedAt: null,
      ...(userId ? { userId } : {}),
    },
    include: {
      user: {
        select: {
          userId: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
        },
      },
      bookingPassengers: {
        where: { deletedAt: null },
        include: {
          passenger: true,
        },
      },
    },
  });

  if (!booking) {
    throw new GraphQLError('Không tìm thấy thông tin đơn hàng này hoặc bạn không có quyền xem!', {
      extensions: { code: 'NOT_FOUND', http: { status: 404 } },
    });
  }

  const customFields = (booking.customFields as any) || {};
  const flightSnapshot = customFields.flightSnapshot || {};
  const passengerSnapshots = customFields.passengerSnapshots || [];

  // Fallback to bookingPassengers if snapshot missing
  const passengers =
    passengerSnapshots.length > 0
      ? passengerSnapshots
      : booking.bookingPassengers.map((bp) => {
          const p = bp.passenger;
          const pCustom = (bp.customFields as any) || {};
          return {
            passengerId: p.passengerId,
            duffelPassengerId: pCustom.duffelPassengerId || null,
            type: p.type,
            title: pCustom.title || (p.gender === 'female' ? 'ms' : 'mr'),
            firstName: p.firstName,
            lastName: p.lastName,
            dateOfBirth: p.dateOfBirth ? p.dateOfBirth.toISOString().split('T')[0] : null,
            gender: p.gender,
            nationality: p.nationality,
            passportNumber: p.passportNumber,
            passportCountry: p.passportCountry,
            passportExpiryDate: p.passportExpiryDate
              ? p.passportExpiryDate.toISOString().split('T')[0]
              : null,
            seatNumber: pCustom.seatNumber || null,
            seatServiceId: pCustom.seatServiceId || null,
          };
        });

  return {
    bookingId: booking.bookingId,
    userId: booking.userId,
    user: booking.user
      ? {
          userId: booking.user.userId,
          email: booking.user.email,
          phone: booking.user.phone,
          firstName: booking.user.firstName,
          lastName: booking.user.lastName,
        }
      : null,
    provider: booking.provider,
    providerBookingId: booking.providerBookingId,
    bookingReference: flightSnapshot.bookingReference || booking.providerBookingId || 'N/A',
    paymentRequiredBy: flightSnapshot.paymentRequiredBy || null,
    status: booking.status,
    totalAmount: booking.totalAmount.toString(),
    currency: booking.currency,
    carrier: flightSnapshot.carrier || null,
    slices: flightSnapshot.slices || [],
    passengers,
    conditions: flightSnapshot.conditions || null,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}

export default getBookingDetail;
