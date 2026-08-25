import { searchFlightsViaProvider } from '@/servers/flight/search.js';
import type { FlightSearchInput } from '@/types/flight.js';

import '@/servers/duffel/index.js';

export const typeDefs = `#graphql
  enum CabinClass {
    ECONOMY
    PREMIUM_ECONOMY
    BUSINESS
    FIRST
  }

  input FlightSearchInput {
    provider: String
    origin: String!
    destination: String!
    departureDate: String!
    returnDate: String
    cabinClass: CabinClass
    adults: Int
    children: Int
    infants: Int
  }

  type FlightAirport {
    iataCode: String!
    name: String!
    cityName: String
  }

  type FlightCarrier {
    iataCode: String!
    name: String!
    logoUrl: String
  }

  type FlightSegment {
    origin: FlightAirport!
    destination: FlightAirport!
    departureAt: String!
    arrivalAt: String!
    carrier: FlightCarrier!
    flightNumber: String!
    aircraft: String
    duration: String!
  }

  type FlightSlice {
    origin: FlightAirport!
    destination: FlightAirport!
    departureDate: String!
    duration: String!
    segments: [FlightSegment!]!
  }

  type FlightOffer {
    offerId: ID!
    totalAmount: String!
    currency: String!
    expiresAt: String!
    carrier: FlightCarrier!
    slices: [FlightSlice!]!
  }

  type FlightSearchResult {
    offerRequestId: ID!
    totalOffers: Int!
    offers: [FlightOffer!]!
  }

  extend type Query {
    searchFlights(input: FlightSearchInput!): FlightSearchResult!
  }
`;

export const resolvers = {
  Query: {
    searchFlights: async (_parent: unknown, args: { input: FlightSearchInput }) => {
      return await searchFlightsViaProvider(args.input);
    },
  },
};
