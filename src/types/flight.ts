import type { HoldOrderProviderParams, ProviderHoldOrderResponse } from './booking.js';

export enum CabinClass {
  ECONOMY = 'economy',
  PREMIUM_ECONOMY = 'premium_economy',
  BUSINESS = 'business',
  FIRST = 'first',
}

export enum FlightPassengerType {
  ADULT = 'adult',
  CHILD = 'child',
  INFANT_WITHOUT_SEAT = 'infant_without_seat',
}

export interface PassengerLoyaltyInput {
  passengerIndex?: number;
  airlineIataCode: string;
  accountNumber: string;
}

export interface FlightSearchInput {
  provider?: string | null;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string | null;
  cabinClass?: CabinClass;
  adults?: number;
  children?: number;
  infants?: number;
  maxConnections?: number | null;
  corporateCode?: string | null;
  passengersLoyalty?: PassengerLoyaltyInput[] | null;
  view?: string | null; // "offers" | "itineraries"
}

export interface FlightAirport {
  iataCode: string;
  name: string;
  cityName?: string | null;
}

export interface FlightCarrier {
  iataCode: string;
  name: string;
  logoUrl?: string | null;
}

export interface FlightSegment {
  origin: FlightAirport;
  destination: FlightAirport;
  departureAt: string;
  arrivalAt: string;
  carrier: FlightCarrier;
  flightNumber: string;
  aircraft?: string | null;
  duration: string;
}

export interface FlightSlice {
  origin: FlightAirport;
  destination: FlightAirport;
  departureDate: string;
  duration: string;
  segments: FlightSegment[];
}

export interface ConditionDetail {
  allowed: boolean;
  penaltyAmount?: string | null;
  penaltyCurrency?: string | null;
}

export interface OfferConditions {
  refundBeforeDeparture?: ConditionDetail | null;
  changeBeforeDeparture?: ConditionDetail | null;
}

export interface FlightOffer {
  offerId: string;
  totalAmount: string;
  currency: string;
  expiresAt: string;
  isSplitTicket?: boolean;
  allowedToHold?: boolean;
  carrier: FlightCarrier;
  slices: FlightSlice[];
  conditions?: OfferConditions | null;
}

export interface FlightSearchResult {
  offerRequestId: string;
  totalOffers: number;
  offers: FlightOffer[];
}

export interface IFlightProvider {
  readonly providerCode: string;
  searchFlights(input: FlightSearchInput): Promise<FlightSearchResult>;
  getOfferDetails(offerId: string): Promise<any>;
  createHoldOrder(params: HoldOrderProviderParams): Promise<ProviderHoldOrderResponse>;
  cancelOrder(providerBookingId: string): Promise<boolean>;
}
