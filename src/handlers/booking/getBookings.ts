import getBookings from '@/servers/booking/getBookings.js';
import getBookingDetail from '@/servers/booking/getBookingDetail.js';
import { requireAuth } from '@/shared/auth-guard.js';
import { BookingSearchResult, SearchBookingsInput } from '@/types/booking.js';
import { GraphQLContext } from '@/types/context.js';

export const typeDefs = `#graphql
  input SearchBookingsInput {
    search: String!
    status: String
    orderBy: String!
    order: String!
    page: Int!
    limit: Int!
  }

  type BookingSearchResult {
    bookingId: String!
    bookingReference: String!
    provider: String!
    status: String!
    totalAmount: String!
    currency: String!
    createdAt: String!
    updatedAt: String!
  }

  type BookingUser {
    userId: ID!
    email: String!
    phone: String
    firstName: String
    lastName: String
  }

  type BookingDetail {
    bookingId: ID!
    userId: ID!
    user: BookingUser
    provider: String!
    providerBookingId: String
    bookingReference: String!
    paymentRequiredBy: String
    status: String!
    totalAmount: String!
    currency: String!
    carrier: FlightCarrier
    slices: [FlightSlice!]!
    passengers: [BookingPassengerSnapshot!]!
    conditions: OfferConditions
    createdAt: String!
    updatedAt: String!
  }
 
  extend type Query {
    searchBookings(input: SearchBookingsInput!): [BookingSearchResult!]!
    getBookingDetail(bookingId: ID!): BookingDetail!
  }
`;

export const resolvers = {
  Query: {
    searchBookings: async (
      _parent: unknown,
      args: { input: SearchBookingsInput },
      context: GraphQLContext,
    ): Promise<BookingSearchResult[]> => {
      const currentUser = requireAuth(context);
      return await getBookings(args.input, currentUser.userId);
    },

    getBookingDetail: async (
      _parent: unknown,
      args: { bookingId: string },
      context: GraphQLContext,
    ) => {
      const currentUser = requireAuth(context);
      return await getBookingDetail(args.bookingId, currentUser.userId);
    },
  },
};
