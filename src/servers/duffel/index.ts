import { FlightProvider } from '@/shared/provider.js';
import type { FlightSearchInput, FlightSearchResult, IFlightProvider } from '@/types/flight.js';
import type { HoldOrderProviderParams, ProviderHoldOrderResponse } from '@/types/booking.js';
import { searchFlights } from './search.js';
import { createDuffelHoldOrder } from './holdOrder.js';
import { getDuffelOffer } from './offer.js';
// import { cancelDuffelOrder } from './cancelOrder.js';

@FlightProvider('duffel')
class DuffelFlightProvider implements IFlightProvider {
  readonly providerCode = 'duffel';

  async searchFlights(input: FlightSearchInput): Promise<FlightSearchResult> {
    return await searchFlights(input);
  }

  async getOfferDetails(offerId: string): Promise<any> {
    return await getDuffelOffer(offerId);
  }

  async createHoldOrder(params: HoldOrderProviderParams): Promise<ProviderHoldOrderResponse> {
    return await createDuffelHoldOrder(params);
  }

  // async cancelOrder(providerBookingId: string): Promise<boolean> {
  //   return await cancelDuffelOrder(providerBookingId);
  // }
}

const duffelFlightProvider = new DuffelFlightProvider();
export default duffelFlightProvider;
