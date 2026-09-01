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
  const slices: any[] = [
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

  const passengers: any[] = [
    ...Array(Math.max(1, input.adults ?? 1))
      .fill(null)
      .map((_, idx) => {
        const loyalty = input.passengersLoyalty?.find(
          (l) => l.passengerIndex === undefined || l.passengerIndex === idx,
        );
        return {
          type: FlightPassengerType.ADULT,
          ...(loyalty
            ? {
                loyalty_programme_accounts: [
                  {
                    airline_iata_code: loyalty.airlineIataCode.toUpperCase(),
                    account_number: loyalty.accountNumber,
                  },
                ],
              }
            : {}),
        };
      }),
    ...Array(input.children ?? 0).fill({ type: FlightPassengerType.CHILD }),
    ...Array(input.infants ?? 0).fill({ type: FlightPassengerType.INFANT_WITHOUT_SEAT }),
  ];

  const payloadData: any = {
    slices,
    passengers,
    cabin_class: (input.cabinClass || CabinClass.ECONOMY).toLowerCase(),
  };

  if (input.maxConnections !== undefined && input.maxConnections !== null) {
    payloadData.max_connections = input.maxConnections;
  }

  if (input.corporateCode) {
    payloadData.corporate_code = input.corporateCode;
  }

  return { data: payloadData };
}

export function transformSearchResponse(data: any, rawOffersOverride?: any[]): FlightSearchResult {
  const rawOffers = rawOffersOverride || data.offers || [];

  const offers = rawOffers.map((offer: any) => {
    const refundCond = offer.conditions?.refund_before_departure;
    const changeCond = offer.conditions?.change_before_departure;

    return {
      offerId: offer.id,
      totalAmount: offer.total_amount,
      currency: offer.total_currency || offer.currency || 'USD',
      expiresAt: offer.expires_at,
      isSplitTicket: Boolean(offer.is_split_ticket),
      carrier: {
        iataCode: offer.owner?.iata_code || 'ZZ',
        name: offer.owner?.name || 'Standard Airline',
        logoUrl: offer.owner?.logo_symbol_url ?? null,
      },
      conditions: offer.conditions
        ? {
            refundBeforeDeparture: refundCond
              ? {
                  allowed: Boolean(refundCond.allowed),
                  penaltyAmount: refundCond.penalty_amount ?? null,
                  penaltyCurrency: refundCond.penalty_currency ?? null,
                }
              : null,
            changeBeforeDeparture: changeCond
              ? {
                  allowed: Boolean(changeCond.allowed),
                  penaltyAmount: changeCond.penalty_amount ?? null,
                  penaltyCurrency: changeCond.penalty_currency ?? null,
                }
              : null,
          }
        : null,
      slices: (offer.slices || []).map((slice: any) => ({
        origin: {
          iataCode: slice.origin?.iata_code || '',
          name: slice.origin?.name || '',
          cityName: slice.origin?.city_name ?? null,
        },
        destination: {
          iataCode: slice.destination?.iata_code || '',
          name: slice.destination?.name || '',
          cityName: slice.destination?.city_name ?? null,
        },
        departureDate:
          slice.departure_date ||
          slice.segments?.[0]?.departing_at?.split('T')[0] ||
          slice.segments?.[0]?.departing_at ||
          '',
        duration: slice.duration || 'PT0H',
        segments: (slice.segments || []).map((seg: any) => ({
          origin: {
            iataCode: seg.origin?.iata_code || '',
            name: seg.origin?.name || '',
          },
          destination: {
            iataCode: seg.destination?.iata_code || '',
            name: seg.destination?.name || '',
          },
          departureAt: seg.departing_at || '',
          arrivalAt: seg.arriving_at || '',
          carrier: {
            iataCode: seg.operating_carrier?.iata_code || 'ZZ',
            name: seg.operating_carrier?.name || 'Standard Airline',
            logoUrl: seg.operating_carrier?.logo_symbol_url ?? null,
          },
          flightNumber: `${seg.operating_carrier?.iata_code || ''}${seg.operating_carrier_flight_number || ''}`,
          aircraft: seg.aircraft?.name ?? null,
          duration: seg.duration || 'PT0H',
        })),
      })),
    };
  });

  return {
    offerRequestId: data.id,
    totalOffers: offers.length,
    offers,
  };
}

export async function searchFlights(input: FlightSearchInput): Promise<FlightSearchResult> {
  const payload = buildSearchPayload(input);
  const viewFormat = input.view ? input.view.toLowerCase() : 'offers';

  console.log('🛫 [Duffel] Gửi yêu cầu tìm chuyến bay:', {
    origin: input.origin,
    destination: input.destination,
    departureDate: input.departureDate,
    returnDate: input.returnDate ?? 'Một chiều (One-way)',
    passengers: payload.data.passengers.length,
    cabinClass: payload.data.cabin_class,
    view: viewFormat,
    maxConnections: input.maxConnections ?? 'Không giới hạn',
    corporateCode: input.corporateCode ?? 'Không dùng',
  });

  try {
    const startTime = Date.now();

    // Construct URL with query parameters
    let requestUrl = `${env.DUFFEL_API_URL}/air/offer_requests?return_offers=true`;
    if (viewFormat === 'itineraries') {
      requestUrl += '&view=itineraries';
    }

    console.log(`🔗 [Duffel Request URL]: ${requestUrl}`);

    const response = await got.post<{ data: any }>(requestUrl, {
      headers: {
        Authorization: `Bearer ${env.DUFFEL_API_TOKEN}`,
        'Duffel-Version': 'v2',
        'Content-Type': 'application/json',
      },
      json: payload,
      responseType: 'json',
    });
    const duration = Date.now() - startTime;

    const resData = response.body.data;
    console.log(`✅ [Duffel API Response] Status 201 trong ${duration}ms!`);
    console.log(`📦 [Duffel Raw Data Keys]:`, JSON.stringify(response, null, 2));
    console.log(
      `📦 [Duffel Raw Offers Count on POST]:`,
      resData.offers?.length ?? 'undefined/none',
    );

    let rawOffers = resData.offers;

    if (!rawOffers || rawOffers.length === 0) {
      console.log(
        `🔄 [Duffel Fallback] POST response không chứa offers. Đang lấy danh sách vé qua GET /air/offers?offer_request_id=${resData.id}...`,
      );
      const getOffersResponse = await got.get<{ data: any[] }>(
        `${env.DUFFEL_API_URL}/air/offers?offer_request_id=${resData.id}`,
        {
          headers: {
            Authorization: `Bearer ${env.DUFFEL_API_TOKEN}`,
            'Duffel-Version': 'v2',
          },
          responseType: 'json',
        },
      );
      rawOffers = getOffersResponse.body.data || [];
      console.log(
        `🎉 [Duffel Fallback Thành công] Lấy về ${rawOffers.length} vé qua GET /air/offers!`,
      );
    }

    const result = transformSearchResponse(resData, rawOffers);

    console.log(`📦 [Duffel] Offer Request ID: ${result.offerRequestId}`);
    console.log(`🎫 [Duffel] Tổng số chuyến bay xử lý: ${result.totalOffers}`);

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
