import { env } from '@/shared/env.js';
import {
  PassengerTitle,
  ProviderGender,
  type HoldOrderProviderParams,
  type ProviderHoldOrderResponse,
} from '@/types/booking.js';
import { GraphQLError } from 'graphql';
import got from 'got';
import { getDuffelOffer } from './offer.js';
import type { Passenger, User } from '@generated/prisma/client.js';

export function mappingDuffelPassengers({
  passengers,
  offerPassengers = [],
  user = { email: 'traveler@example.com', phone: '+84901234567' },
}: {
  passengers: Partial<Passenger>[];
  offerPassengers?: Array<{ id: string; [key: string]: any }>;
  user?: Pick<User, 'email' | 'phone'>;
}) {
  const userEmail = user?.email || 'traveler@example.com';
  const userPhone = user?.phone || '+84901234567';

  return passengers.map((p, index) => {
    const isFemale = p.gender?.toLowerCase() === 'female';
    const bornOn = p.dateOfBirth
      ? new Date(p.dateOfBirth).toISOString().split('T')[0]!
      : '1990-01-01';

    const offerPassengerId = offerPassengers?.[index]?.id || offerPassengers?.[0]?.id;

    const passengerPayload: any = {
      ...(offerPassengerId ? { id: offerPassengerId } : {}),
      title: isFemale ? PassengerTitle.MS : PassengerTitle.MR,
      given_name: p.firstName || 'Traveler',
      family_name: p.lastName || 'Passenger',
      born_on: bornOn,
      gender: isFemale ? ProviderGender.FEMALE : ProviderGender.MALE,
      email: userEmail,
      phone_number: userPhone,
    };

    if (p.passportNumber) {
      passengerPayload.identity_documents = [
        {
          type: 'passport',
          unique_identifier: p.passportNumber,
          issuing_country_code: p.passportCountry || 'VN',
          expires_on: p.passportExpiryDate
            ? new Date(p.passportExpiryDate).toISOString().split('T')[0]!
            : '2030-01-01',
        },
      ];
    }

    return passengerPayload;
  });
}

export async function createDuffelHoldOrder(
  params: HoldOrderProviderParams,
): Promise<ProviderHoldOrderResponse> {
  const { offerId, passengers } = params;

  const offer = await getDuffelOffer(offerId);
  const offerPassengers = offer.passengers || [];

  if (offer.payment_requirements?.requires_instant_payment) {
    throw new GraphQLError(
      'Hãng hàng không bắt buộc vé này phải thanh toán ngay (Instant Payment), không hỗ trợ giữ chỗ (Hold Order). Vui lòng chọn chuyến bay khác!',
      {
        extensions: {
          code: 'HOLD_NOT_SUPPORTED',
          http: { status: 400 },
        },
      },
    );
  }

  const user = params.user || { email: 'traveler@example.com', phone: '+84901234567' };
  const duffelPassengers = mappingDuffelPassengers({ passengers, offerPassengers, user });

  const payload = {
    data: {
      type: 'hold',
      selected_offers: [offerId],
      passengers: duffelPassengers,
    },
  };

  console.log('🎟️ [Duffel Hold Order] Gửi yêu cầu giữ chỗ:', {
    offerId,
    passengerCount: duffelPassengers.length,
    payload: JSON.stringify(payload, null, 2),
  });

  try {
    const startTime = Date.now();
    const response = await got.post<{ data: any }>(`${env.DUFFEL_API_URL}/air/orders`, {
      headers: {
        Authorization: `Bearer ${env.DUFFEL_API_TOKEN}`,
        'Duffel-Version': 'v2',
        'Content-Type': 'application/json',
      },
      json: payload,
      responseType: 'json',
    });
    const duration = Date.now() - startTime;

    const order = response.body.data;

    console.log(`✅ [Duffel Hold Order] Giữ chỗ thành công trong ${duration}ms!`);
    console.log(`📦 Order ID: ${order.id} | Mã PNR: ${order.booking_reference}`);
    console.log(`⏳ Hạn thanh toán (Payment Required By): ${order.payment_required_by}`);

    const primaryOwner = order.owner || order.slices?.[0]?.segments?.[0]?.operating_carrier;

    return {
      orderId: order.id,
      bookingReference: order.booking_reference,
      paymentRequiredBy: order.payment_required_by ?? null,
      totalAmount: order.total_amount,
      currency: order.total_currency,
      carrier: {
        iataCode: primaryOwner?.iata_code || '',
        name: primaryOwner?.name || '',
        logoUrl: primaryOwner?.logo_symbol_url ?? null,
      },
      slices: (order.slices || []).map((slice: any) => ({
        origin: {
          iataCode: slice.origin.iata_code,
          name: slice.origin.name,
          cityName: slice.origin.city_name ?? null,
        },
        destination: {
          iataCode: slice.destination.iata_code,
          name: slice.destination.name,
          cityName: slice.destination.city_name ?? null,
        },
        departureDate:
          slice.departure_date || slice.segments?.[0]?.departing_at?.split('T')[0] || '',
        duration: slice.duration,
        segments: (slice.segments || []).map((seg: any) => ({
          origin: { iataCode: seg.origin.iata_code, name: seg.origin.name },
          destination: { iataCode: seg.destination.iata_code, name: seg.destination.name },
          departureAt: seg.departing_at,
          arrivalAt: seg.arriving_at,
          carrier: {
            iataCode: seg.operating_carrier.iata_code,
            name: seg.operating_carrier.name,
            logoUrl: seg.operating_carrier.logo_symbol_url ?? null,
          },
          flightNumber: `${seg.operating_carrier.iata_code}${seg.operating_carrier_flight_number}`,
          aircraft: seg.aircraft?.name ?? null,
          duration: seg.duration,
        })),
      })),
      passengers: order.passengers || [],
      conditions: order.conditions ?? null,
    };
  } catch (error: any) {
    const duffelErrors = error?.response?.body?.errors;
    let errorMsg =
      duffelErrors?.map((e: any) => `${e.title || e.type}: ${e.message}`).join(', ') ||
      error.message ||
      'Lỗi khi thực hiện giữ chỗ từ Duffel';

    const isInvalidType = duffelErrors?.some((e: any) => e.code === 'invalid_order_create_type');
    if (isInvalidType) {
      errorMsg =
        'Hãng hàng không của chuyến bay này không hỗ trợ giữ chỗ (Hold Order). Vui lòng chọn chuyến bay khác!';
    }

    console.error('❌ [Duffel Hold Order Error]:', errorMsg);
    if (duffelErrors) {
      console.error('   Chi tiết lỗi từ Duffel API:', JSON.stringify(duffelErrors, null, 2));
    }

    throw new GraphQLError(errorMsg, {
      extensions: {
        code: isInvalidType ? 'HOLD_NOT_SUPPORTED' : 'HOLD_ORDER_FAILED',
        http: { status: error?.response?.statusCode || 400 },
        duffelErrors,
      },
    });
  }
}
