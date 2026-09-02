import { env } from '@/shared/env.js';
import got from 'got';
import { GraphQLError } from 'graphql';
import type { SeatMapResult } from '@/types/seat.js';

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

    const seatMaps: SeatMapResult[] = rawMaps.map((map: any) => {
      const cabins = (map.cabins || []).map((cabin: any) => ({
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
      }));

      return {
        id: map.id,
        sliceId: map.slice_id,
        segmentId: map.segment_id,
        cabins,
      };
    });

    return seatMaps;
  } catch (error: any) {
    const duffelErrors = error?.response?.body?.errors;
    const isExpired = duffelErrors?.some(
      (e: any) =>
        e.code === 'offer_no_longer_available' ||
        e.message?.includes('no longer available') ||
        e.title?.includes('no longer available'),
    );

    const errorMsg =
      duffelErrors?.map((e: any) => `${e.title || e.type}: ${e.message}`).join(', ') ||
      error.message ||
      'Không thể lấy sơ đồ ghế ngồi từ Duffel';

    console.error('❌ [Duffel SeatMaps Error]:', errorMsg);

    throw new GraphQLError(errorMsg, {
      extensions: {
        code: isExpired ? 'OFFER_EXPIRED' : 'SEAT_MAP_ERROR',
        http: { status: error?.response?.statusCode || 400 },
        duffelErrors,
      },
    });
  }
}
