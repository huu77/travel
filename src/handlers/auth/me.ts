import { GraphQLContext } from '@/types/context.js';
import { requireAuth } from '@/shared/auth-guard.js';
import getUserProfile from '@/servers/auth/profile.js';

export const typeDefs = `#graphql
  type Profile {
    user: User!
  }

  extend type Query {
    profile: Profile!
  }
`;

export const resolvers = {
  Query: {
    profile: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      const currentUser = requireAuth(context);
      return await getUserProfile(currentUser.userId);
    },
  },
};
