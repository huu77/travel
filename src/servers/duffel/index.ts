import { FlightProvider } from '@/shared/provider.js';
import type { FlightSearchInput, FlightSearchResult, IFlightProvider } from '@/types/flight.js';
import { searchFlights } from './search.js';

@FlightProvider('duffel')
export class DuffelFlightProvider implements IFlightProvider {
  readonly providerCode = 'duffel';

  async searchFlights(input: FlightSearchInput): Promise<FlightSearchResult> {
    return await searchFlights(input);
  }

  // 🎟️ 2. Giữ chỗ (Hold Order) - Sẽ ủy thác sang ./holdOrder.js
  // async createHoldOrder(offerId: string, passengers: unknown[]) {
  //   return await createHoldOrder(offerId, passengers);
  // }

  // ❌ 3. Hủy giữ chỗ - Sẽ ủy thác sang ./cancelOrder.js
  // async cancelOrder(providerBookingId: string) {
  //   return await cancelOrder(providerBookingId);
  // }
}

export * from './search.js';
