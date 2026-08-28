import createHoldOrderViaProvider from '@/servers/flight/holdOrder.js';
import { requireAuth } from '@/shared/auth-guard.js';
import type { GraphQLContext } from '@/types/context.js';
import type { HoldOrderInput, HoldOrderResult } from '@/types/booking.js';

export const typeDefs = `#graphql 
  scalar UUID
  scalar DateTime

  enum PassengerType {
    ADULT
    CHILD
    INFANT
  }

  input OfferPassengerInput {
    userId: UUID
    passengerid: UUID
    type: PassengerType
    firstName: String
    lastName: String

    dateOfBirth: DateTime!
    gender: String!
    nationality: String!

    passportNumber: String!
    passportCountry: String!
    passportExpiryDate: DateTime!
  }

  input HoldOrderInput {
    providerId: String!
    offerId: String!
    passengerIds: [ID!]!
    offerPassengers: [OfferPassengerInput!]
  }

  type BookingPassengerSnapshot {
    passengerId: ID!
    duffelPassengerId: String
    type: String!
    title: String
    firstName: String!
    lastName: String!
    dateOfBirth: String
    gender: String
    nationality: String
    passportNumber: String
    passportCountry: String
    passportExpiryDate: String
  }

  type HoldOrderResult {
    bookingId: ID!
    userId: ID!
    provider: String!
    providerBookingId: String!
    bookingReference: String! # Mã PNR (VD: "VN789X")
    paymentRequiredBy: String # Hạn chót thanh toán giữ chỗ (ISO DateTime)
    status: String!           # "PENDING"
    totalAmount: String!
    currency: String!
    carrier: FlightCarrier!
    slices: [FlightSlice!]!
    passengers: [BookingPassengerSnapshot!]!
    createdAt: String!
  }

  extend type Mutation {
    createFlightBooking(input: HoldOrderInput!): HoldOrderResult!
  }
`;

export const resolvers = {
  Mutation: {
    createFlightBooking: async (
      _parent: unknown,
      args: { input: HoldOrderInput },
      context: GraphQLContext,
    ): Promise<HoldOrderResult> => {
      const currentUser = requireAuth(context);
      return await createHoldOrderViaProvider(currentUser.userId, args.input);
    },
  },
};
