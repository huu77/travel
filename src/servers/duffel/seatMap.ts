import { env } from '@/shared/env.js';
import got from 'got';
import { GraphQLError } from 'graphql';

export interface SeatElement {
  type: string; // "seat", "empty", "galley", "lavatory", "exit_door"
  designator?: string | null; // "12A"
  name?: string | null;
  disclosures?: string[];
  availableServices?: {
    serviceId: string;
    totalAmount: string;
    totalCurrency: string;
  }[];
}

export interface SeatRowSection {
  elements: SeatElement[];
}

export interface SeatRow {
  sections: SeatRowSection[];
}

export interface SeatCabin {
  cabinClass: string;
  deck: number;
  wings?: {
    firstRowIndex: number;
    lastRowIndex: number;
  } | null;
  rows: SeatRow[];
}

export interface SeatMapResult {
  id: string;
  sliceId: string;
  segmentId: string;
  cabins: SeatCabin[];
}

export async function getDuffelSeatMaps(offerId: string): Promise<SeatMapResult[]> {
  console.log(`🛫 [Duffel] Lấy sơ đồ ghế ngồi cho Offer ID: ${offerId}`);
  try {
    const response = await got.get<{ data: any[] }>(
      `${env.DUFFEL_API_URL}/air/seat_maps?offer_id=${offerId}`,
      {
        headers: {
          Authorization: `Bearer ${env.DUFFEL_API_TOKEN}`,
          'Duffel-Version': 'v2',
        },
        responseType: 'json',
      },
    );

    const rawMaps = response.body.data || [];
    console.log(`✅ [Duffel] Lấy sơ đồ ghế thành công! Tìm thấy ${rawMaps.length} sơ đồ.`);

    return rawMaps.map((map: any) => ({
      id: map.id,
      sliceId: map.slice_id,
      segmentId: map.segment_id,
      cabins: (map.cabins || []).map((cabin: any) => ({
        cabinClass: cabin.cabin_class,
        deck: cabin.deck ?? 1,
        wings: cabin.wings
          ? {
              firstRowIndex: cabin.wings.first_row_index,
              lastRowIndex: cabin.wings.last_row_index,
            }
          : null,
        rows: (cabin.rows || []).map((row: any) => ({
          sections: (row.sections || []).map((sec: any) => ({
            elements: (sec.elements || []).map((el: any) => ({
              type: el.type,
              designator: el.designator ?? null,
              name: el.name ?? null,
              disclosures: el.disclosures ?? [],
              availableServices: (el.available_services || []).map((srv: any) => ({
                serviceId: srv.id,
                totalAmount: srv.total_amount,
                totalCurrency: srv.total_currency,
              })),
            })),
          })),
        })),
      })),
    }));
  } catch (error: any) {
    const duffelErrors = error?.response?.body?.errors;
    const errorMsg =
      duffelErrors?.map((e: any) => `${e.title || e.type}: ${e.message}`).join(', ') ||
      error.message ||
      'Không thể lấy sơ đồ ghế ngồi từ Duffel';

    console.error('❌ [Duffel SeatMaps Error]:', errorMsg);

    throw new GraphQLError(errorMsg, {
      extensions: {
        code: 'SEAT_MAP_ERROR',
        http: { status: error?.response?.statusCode || 400 },
        duffelErrors,
      },
    });
  }
}
