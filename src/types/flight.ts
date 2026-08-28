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

export interface FlightSearchInput {
  provider?: string | null; // Mã nhà cung cấp: "duffel", "amadeus" (Mặc định: "duffel")
  origin: string; // Mã IATA sân bay đi: "SGN"
  destination: string; // Mã IATA sân bay đến: "HAN"
  departureDate: string; // "2026-09-25"
  returnDate?: string | null; // Khứ hồi (nếu có)
  cabinClass?: CabinClass; // Mặc định: CabinClass.ECONOMY
  adults?: number; // Mặc định: 1
  children?: number; // Mặc định: 0
  infants?: number; // Mặc định: 0
}

export interface FlightAirport {
  iataCode: string; // "SGN"
  name: string; // "Tan Son Nhat International Airport"
  cityName?: string; // "Ho Chi Minh City"
}

export interface FlightCarrier {
  iataCode: string; // "VN"
  name: string; // "Vietnam Airlines"
  logoUrl?: string | null;
}

export interface FlightSegment {
  origin: FlightAirport;
  destination: FlightAirport;
  departureAt: string; // ISO DateTime
  arrivalAt: string; // ISO DateTime
  carrier: FlightCarrier;
  flightNumber: string; // "VN216"
  aircraft?: string | null; // "Boeing 787-9"
  duration: string; // "PT2H10M"
}

export interface FlightSlice {
  origin: FlightAirport;
  destination: FlightAirport;
  departureDate: string;
  duration: string;
  segments: FlightSegment[];
}

export interface FlightOffer {
  offerId: string; // Duffel Offer ID: "off_00009ht..."
  totalAmount: string; // "3850000"
  currency: string; // "VND"
  expiresAt: string; // Thời hạn giữ giá của hãng
  carrier: FlightCarrier;
  slices: FlightSlice[];
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
