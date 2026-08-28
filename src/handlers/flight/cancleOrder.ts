import { requireAuth } from '@/shared/auth-guard.js';
import type { GraphQLContext } from '@/types/context.js';
import cancelFlightBookingViaProvider from '@/servers/flight/cancelFlight.js';

export const typeDefs = `#graphql 
  scalar UUID
  
  extend type Mutation {
    cancelFlightBooking(bookingId: UUID!): Boolean!
  }
`;

export const resolvers = {
  Mutation: {
    cancelFlightBooking: async (
      _parent: unknown,
      args: { bookingId: string },
      context: GraphQLContext,
    ): Promise<boolean> => {
      const currentUser = requireAuth(context);
      return await cancelFlightBookingViaProvider(args.bookingId, currentUser.userId);
    },
  },
};
