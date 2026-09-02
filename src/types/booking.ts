import type { FlightCarrier, FlightSlice } from './flight.js';
import { PassengerType, type Passenger, type User } from '@generated/prisma/client.js';

export enum PassengerTitle {
  MR = 'mr',
  MS = 'ms',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum ProviderGender {
  MALE = 'm',
  FEMALE = 'f',
}

export interface OfferPassengerInput {
  passengerId?: string;
  userId: string;
  type: PassengerType;
  firstName: string;
  lastName: string;

  dateOfBirth: string;
  gender: Gender;
  nationality: string;

  passportNumber: string;
  passportCountry: string;
  passportExpiryDate: string;
}

export interface SelectedSeatInput {
  passengerIndex?: number;
  passengerName?: string;
  designator: string;
  serviceId?: string;
  segmentId?: string;
  totalAmount?: string;
  totalCurrency?: string;
}

export interface HoldOrderInput {
  providerId: string;
  offerId: string;
  passengerIds: string[];
  offerPassengers?: OfferPassengerInput[];
  selectedSeats?: SelectedSeatInput[];
}

export interface HoldOrderProviderParams {
  offerId: string;
  passengers: Partial<Passenger>[];
  offerPassengers?: Array<{ id: string; [key: string]: any }>;
  user?: Pick<User, 'email' | 'phone'>;
}

export interface BookingPassengerSnapshot {
  passengerId: string;
  duffelPassengerId?: string | null | undefined;
  type: string;
  title?: string | null | undefined;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null | undefined;
  gender?: string | null | undefined;
  nationality?: string | null | undefined;
  passportNumber?: string | null | undefined;
  passportCountry?: string | null | undefined;
  passportExpiryDate?: string | null | undefined;
  seatNumber?: string | null | undefined;
  seatServiceId?: string | null | undefined;
}

export interface FlightBookingSnapshot {
  bookingReference: string;
  paymentRequiredBy: string | null | undefined;
  duffelOfferId: string;
  cabinClass?: string | null | undefined;
  carrier: FlightCarrier;
  slices: FlightSlice[];
  conditions?:
    | {
        refundBeforeDeparture?: boolean | null | undefined;
        changeBeforeDeparture?: boolean | null | undefined;
      }
    | null
    | undefined;
}

export interface HoldOrderResult {
  bookingId: string;
  userId: string;
  provider: string;
  providerBookingId: string;
  bookingReference: string;
  paymentRequiredBy: string | null;
  status: string;
  totalAmount: string;
  currency: string;
  carrier: FlightCarrier;
  slices: FlightSlice[];
  passengers: BookingPassengerSnapshot[];
  createdAt: string;
}

export interface ProviderPassengerInput {
  id: string;
  title: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phone: string;
  passportNumber?: string | null | undefined;
  passportCountry?: string | null | undefined;
  passportExpiryDate?: string | null | undefined;
}

export interface ProviderHoldOrderResponse {
  orderId: string;
  bookingReference: string;
  paymentRequiredBy: string | null;
  totalAmount: string;
  currency: string;
  carrier: FlightCarrier;
  slices: FlightSlice[];
  passengers: any[];
  conditions?: any;
}

export interface DuffelOfferPassenger {
  id: string;
  type: 'adult' | 'child' | 'infant_without_seat';
  age?: number | null;
  family_name?: string | null;
  given_name?: string | null;
}

export interface DuffelOfferDetail {
  id: string;
  live_mode?: boolean;
  total_amount: string;
  total_currency: string;
  tax_amount?: string | null;
  tax_currency?: string | null;
  base_amount?: string | null;
  base_currency?: string | null;
  expires_at: string;
  owner: {
    id?: string;
    iata_code: string;
    name: string;
    logo_symbol_url?: string | null;
  };
  passengers: DuffelOfferPassenger[];
  slices: any[];
  conditions?: any;
  payment_requirements?: {
    requires_instant_payment?: boolean;
    price_guarantee_expires_at?: string | null;
    payment_required_by?: string | null;
  };
}

export interface SearchBookingsInput {
  search?: string;
  status?: string;
  orderBy?: string;
  order?: string;
  page?: number;
  limit?: number;
}

export interface BookingSearchResult {
  bookingId: string;
  bookingReference: string;
  provider: string;
  status: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}
