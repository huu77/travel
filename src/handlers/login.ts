import authentication from '../servers/login.js';

export const typeDefs = `#graphql
  input LoginInput {
    email: EmailAddress!
    password: String!
  }

  type ResponseLogin {
    accessToken: String!
    refreshToken: String!
  }

  extend type Mutation {
    authentication(input: LoginInput!): ResponseLogin!
  }
`;

export const resolvers = {
  Mutation: {
    authentication: async (
      _parent: unknown,
      args: {
        input: {
          email: string;
          password: string;
        };
      },
    ) => {
      return authentication(args.input);
    },
  },
};
