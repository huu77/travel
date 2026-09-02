import { FlightProviderRegistry } from '@/shared/provider.js';
import type { FlightSearchInput, FlightSearchResult } from '@/types/flight.js';
import '@/servers/duffel/index.js';

const DEFAULT_EMPTY_FLIGHT_RESULT: FlightSearchResult = {
  offerRequestId: '',
  totalOffers: 0,
  offers: [],
};

import { prisma } from '@/prisma.js';

export const searchFlightsViaProvider = async (
  input: FlightSearchInput,
): Promise<FlightSearchResult> => {
  const providerCode = input.provider?.trim().toLowerCase() || 'duffel';

  try {
    const provider = FlightProviderRegistry.get(providerCode);
    const result = await provider.searchFlights(input);

    const dbProvider = await prisma.provider.findFirst({
      where: {
        code: providerCode,
        deletedAt: null,
      },
      select: {
        providerId: true,
        code: true,
      },
    });

    const providerId = dbProvider?.providerId || null;

    return {
      ...result,
      offers: result.offers.map((offer) => ({
        ...offer,
        providerId,
        provider: providerCode,
      })),
    };
  } catch (error) {
    console.error(
      `❌ [FlightSearch Error] Không tìm thấy hoặc lỗi từ Provider "${providerCode}":`,
      error instanceof Error ? error.message : error,
    );

    return DEFAULT_EMPTY_FLIGHT_RESULT;
  }
};

export default searchFlightsViaProvider;
