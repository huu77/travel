import registerNewUser from '../servers/register.js';

export const typeDefs = `#graphql
  input UserInput {
    email: EmailAddress!
    password: String!
    firstName: String
    lastName: String
    phone: String
  }

  type User {
    userId: ID!
    email: EmailAddress!
    firstName: String
    lastName: String
    phone: String
    createdAt: String
    updatedAt: String
  }

  extend type Mutation {
    register(input: UserInput!): User
  }
`;

export const resolvers = {
  Mutation: {
    register: async (
      _parent: unknown,
      args: {
        input: {
          email: string;
          password: string;
          firstName?: string;
          lastName?: string;
          phone?: string;
        };
      },
    ) => {
      return await registerNewUser(args.input);
    },
  },
};
