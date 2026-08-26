import { FlightProviderRegistry } from '@/shared/provider.js';
import type { FlightSearchInput, FlightSearchResult } from '@/types/flight.js';
import '@/servers/duffel/index.js';

const DEFAULT_EMPTY_FLIGHT_RESULT: FlightSearchResult = {
  offerRequestId: '',
  totalOffers: 0,
  offers: [],
};

export const searchFlightsViaProvider = async (
  input: FlightSearchInput,
): Promise<FlightSearchResult> => {
  const providerCode = input.provider?.trim().toLowerCase() || 'duffel';

  try {
    const provider = FlightProviderRegistry.get(providerCode);
    return await provider.searchFlights(input);
  } catch (error) {
    console.error(
      `❌ [FlightSearch Error] Không tìm thấy hoặc lỗi từ Provider "${providerCode}":`,
      error instanceof Error ? error.message : error,
    );

    return DEFAULT_EMPTY_FLIGHT_RESULT;
  }
};

export default searchFlightsViaProvider;
