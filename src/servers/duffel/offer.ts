import env from '@/shared/env.js';
import { DuffelOfferDetail } from '@/types/booking.js';
import got from 'got';
import { GraphQLError } from 'graphql';

export async function getDuffelOffer(offerId: string): Promise<DuffelOfferDetail> {
  try {
    const response = await got.get<{ data: any }>(`${env.DUFFEL_API_URL}/air/offers/${offerId}`, {
      headers: {
        Authorization: `Bearer ${env.DUFFEL_API_TOKEN}`,
        'Duffel-Version': 'v2',
      },
      responseType: 'json',
    });

    const offer: DuffelOfferDetail = response.body.data;
    const isOfferExpired = offer.expires_at && new Date(offer.expires_at) < new Date();
    if (isOfferExpired) {
      throw new GraphQLError('Vé này đã hết thời gian giữ giá của hãng. Vui lòng tìm kiếm lại!', {
        extensions: {
          code: 'OFFER_EXPIRED',
          http: { status: 410 },
        },
      });
    }

    return offer;
  } catch (error: any) {
    if (error instanceof GraphQLError) throw error;

    const duffelErrors = error?.response?.body?.errors;
    const errorMsg =
      duffelErrors?.map((e: any) => e.message).join(', ') ||
      error.message ||
      'Không thể kiểm tra thông tin vé từ Duffel';

    throw new GraphQLError(errorMsg, {
      extensions: {
        code: 'OFFER_NOT_FOUND',
        http: { status: error?.response?.statusCode || 404 },
        duffelErrors,
      },
    });
  }
}
