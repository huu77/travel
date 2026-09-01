import { env } from '@/shared/env.js';
import got from 'got';
import { GraphQLError } from 'graphql';

export interface PlaceResult {
  id: string;
  iataCode?: string | null;
  name: string;
  cityName?: string | null;
  countryName?: string | null;
  type: string; // "airport" | "city"
  latitude?: number | null;
  longitude?: number | null;
}

export async function searchDuffelPlaces(query: string): Promise<PlaceResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  console.log(`🔍 [Duffel] Gửi yêu cầu tìm kiếm địa điểm/sân bay: "${cleanQuery}"`);

  try {
    const response = await got.get<{ data: any[] }>(
      `${env.DUFFEL_API_URL}/air/places?query=${encodeURIComponent(cleanQuery)}`,
      {
        headers: {
          Authorization: `Bearer ${env.DUFFEL_API_TOKEN}`,
          'Duffel-Version': 'v2',
        },
        responseType: 'json',
      },
    );

    const places = response.body.data || [];
    console.log(`✅ [Duffel] Tìm thấy ${places.length} địa điểm cho từ khóa "${cleanQuery}"`);

    return places.map((place: any) => ({
      id: place.id,
      iataCode: place.iata_code ?? null,
      name: place.name,
      cityName: place.city_name ?? place.city?.name ?? null,
      countryName: place.country_name ?? place.country?.name ?? null,
      type: place.type,
      latitude: place.latitude ?? null,
      longitude: place.longitude ?? null,
    }));
  } catch (error: any) {
    const duffelErrors = error?.response?.body?.errors;
    const errorMsg =
      duffelErrors?.map((e: any) => `${e.title || e.type}: ${e.message}`).join(', ') ||
      error.message ||
      'Không thể tìm kiếm địa điểm từ Duffel';

    console.error('❌ [Duffel Places Error]:', errorMsg);

    throw new GraphQLError(errorMsg, {
      extensions: {
        code: 'PLACES_ERROR',
        http: { status: error?.response?.statusCode || 400 },
        duffelErrors,
      },
    });
  }
}
