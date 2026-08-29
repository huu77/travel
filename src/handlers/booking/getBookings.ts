import getBookings from '@/servers/booking/getBookings.js';
import { requireAuth } from '@/shared/auth-guard.js';
import { BookingSearchResult, SearchBookingsInput } from '@/types/booking.js';
import { GraphQLContext } from '@/types/context.js';

export const typeDefs = `#graphql
  input SearchBookingsInput{
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
 
  extend type Query {
    searchBookings(input: SearchBookingsInput!): [BookingSearchResult!]!
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
  },
};
