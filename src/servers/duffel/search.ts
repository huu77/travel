import { env } from '@/shared/env.js';
import {
  CabinClass,
  FlightPassengerType,
  type FlightSearchInput,
  type FlightSearchResult,
} from '@/types/flight.js';
import { GraphQLError } from 'graphql';
import got from 'got';

function formatDate(date: string | Date): string {
  return (date instanceof Date ? date.toISOString() : date).split('T')[0]!;
}

export function buildSearchPayload(input: FlightSearchInput) {
  const slices = [
    {
      origin: input.origin.trim().toUpperCase(),
      destination: input.destination.trim().toUpperCase(),
      departure_date: formatDate(input.departureDate),
    },
  ];

  if (input.returnDate) {
    slices.push({
      origin: input.destination.trim().toUpperCase(),
      destination: input.origin.trim().toUpperCase(),
      departure_date: formatDate(input.returnDate),
    });
  }

  const passengers = [
    ...Array(Math.max(1, input.adults ?? 1)).fill({ type: FlightPassengerType.ADULT }),
    ...Array(input.children ?? 0).fill({ type: FlightPassengerType.CHILD }),
    ...Array(input.infants ?? 0).fill({ type: FlightPassengerType.INFANT_WITHOUT_SEAT }),
  ];

  return {
    data: {
      slices,
      passengers,
      cabin_class: input.cabinClass ?? CabinClass.ECONOMY,
    },
  };
}

export function transformSearchResponse(data: any): FlightSearchResult {
  const offers = (data.offers || []).map((offer: any) => ({
    offerId: offer.id,
    totalAmount: offer.total_amount,
    currency: offer.total_currency,
    expiresAt: offer.expires_at,
    carrier: {
      iataCode: offer.owner.iata_code,
      name: offer.owner.name,
      logoUrl: offer.owner.logo_symbol_url ?? null,
    },
    slices: (offer.slices || []).map((slice: any) => ({
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
        slice.departure_date ||
        slice.segments?.[0]?.departing_at?.split('T')[0] ||
        slice.segments?.[0]?.departing_at ||
        '',
      duration: slice.duration,
      segments: (slice.segments || []).map((seg: any) => ({
        origin: {
          iataCode: seg.origin.iata_code,
          name: seg.origin.name,
        },
        destination: {
          iataCode: seg.destination.iata_code,
          name: seg.destination.name,
        },
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
  }));

  return {
    offerRequestId: data.id,
    totalOffers: offers.length,
    offers,
  };
}

export async function searchFlights(input: FlightSearchInput): Promise<FlightSearchResult> {
  const payload = buildSearchPayload(input);

  console.log('🛫 [Duffel] Gửi yêu cầu tìm chuyến bay:', {
    origin: input.origin,
    destination: input.destination,
    departureDate: input.departureDate,
    returnDate: input.returnDate ?? 'Một chiều (One-way)',
    passengers: payload.data.passengers.length,
    cabinClass: payload.data.cabin_class,
  });

  try {
    const startTime = Date.now();
    const response = await got.post<{ data: any }>(
      `${env.DUFFEL_API_URL}/air/offer_requests?return_offers=true`,
      {
        headers: {
          Authorization: `Bearer ${env.DUFFEL_API_TOKEN}`,
          'Duffel-Version': 'v2',
          'Content-Type': 'application/json',
        },
        json: payload,
        responseType: 'json',
      },
    );
    const duration = Date.now() - startTime;

    const result = transformSearchResponse(response.body.data);

    console.log(`✅ [Duffel] Tìm kiếm thành công trong ${duration}ms!`);
    console.log(`📦 [Duffel] Offer Request ID: ${result.offerRequestId}`);
    console.log(`🎫 [Duffel] Tổng số chuyến bay tìm thấy: ${result.totalOffers}`);

    if (result.offers.length > 0) {
      console.log('🔍 [Duffel] 3 chuyến bay tiêu biểu:');
      result.offers.slice(0, 3).forEach((offer, idx) => {
        const seg = offer.slices[0]?.segments[0];
        console.log(
          `   ${idx + 1}. Hãng: ${offer.carrier.name} (${offer.carrier.iataCode}) | Giá: ${Number(offer.totalAmount).toLocaleString()} ${offer.currency} | Chuyến bay: ${seg?.flightNumber || 'N/A'} (${seg?.departureAt} -> ${seg?.arrivalAt})`,
        );
      });
    }

    return result;
  } catch (error: any) {
    const duffelErrors = error?.response?.body?.errors;
    const errorMsg =
      duffelErrors?.map((e: any) => `${e.title || e.type}: ${e.message}`).join(', ') ||
      error.message ||
      'Lỗi khi tìm kiếm chuyến bay từ Duffel';

    console.error('❌ [Duffel Error]:', errorMsg);
    if (duffelErrors) {
      console.error('   Chi tiết lỗi từ Duffel API:', JSON.stringify(duffelErrors, null, 2));
    }

    throw new GraphQLError(errorMsg, {
      extensions: {
        code: 'BAD_USER_INPUT',
        http: { status: error?.response?.statusCode || 400 },
        duffelErrors,
      },
    });
  }
}
