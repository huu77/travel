import { env } from '@/shared/env.js';
import { GraphQLError } from 'graphql';
import got from 'got';

export async function cancelDuffelOrder(orderId: string): Promise<boolean> {
  console.log(`❌ [Duffel Cancel] Bắt đầu hủy đơn hàng ${orderId}...`);

  try {
    const createQuoteResponse = await got.post<{ data: any }>(
      `${env.DUFFEL_API_URL}/air/order_cancellations`,
      {
        headers: {
          Authorization: `Bearer ${env.DUFFEL_API_TOKEN}`,
          'Duffel-Version': 'v2',
          'Content-Type': 'application/json',
        },
        json: {
          data: {
            order_id: orderId,
          },
        },
        responseType: 'json',
      },
    );

    const cancellationId = createQuoteResponse.body.data.id;

    await got.post<{ data: any }>(
      `${env.DUFFEL_API_URL}/air/order_cancellations/${cancellationId}/actions/confirm`,
      {
        headers: {
          Authorization: `Bearer ${env.DUFFEL_API_TOKEN}`,
          'Duffel-Version': 'v2',
          'Content-Type': 'application/json',
        },
        responseType: 'json',
      },
    );

    console.log(`✅ [Duffel Cancel] Đã hủy thành công đơn ${orderId} trên Duffel!`);
    return true;
  } catch (error: any) {
    const duffelErrors = error?.response?.body?.errors;
    const errorMsg =
      duffelErrors?.map((e: any) => `${e.title || e.type}: ${e.message}`).join(', ') ||
      error.message ||
      `Không thể hủy đơn ${orderId} trên Duffel`;

    console.error(`🚨 [Duffel Cancel Error]:`, errorMsg);
    throw new GraphQLError(errorMsg, {
      extensions: {
        code: 'CANCEL_ORDER_FAILED',
        http: { status: error?.response?.statusCode || 400 },
        duffelErrors,
      },
    });
  }
}
