import refreshAccessToken from '../servers/refreshToken.js';

export const typeDefs = `#graphql
  input RefreshTokenInput {
    refreshToken: String!
  }

  type RefreshTokenResponse {
    accessToken: String!
  }

  extend type Mutation {
    refreshToken(input: RefreshTokenInput!): RefreshTokenResponse!
  }
`;

export const resolvers = {
  Mutation: {
    refreshToken: async (
      _parent: unknown,
      args: {
        input: {
          refreshToken: string;
        };
      },
    ) => {
      return await refreshAccessToken(args.input.refreshToken);
    },
  },
};
