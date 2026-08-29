import searchPassengers from '@/servers/passenger/searchPassenger.js';
import { SearchPassengerInput } from '@/types/passenger.js';

export const typeDefs = `#graphql
  input SearchPassengerInput{
    search: String!
    orderBy: String!
    order: String!
    page: Int!
    limit: Int!
  }

  type Passenger {
    passengerId: ID!
    firstName: String!
    lastName: String!
    email: String!
    phoneNumber: String!
  }
 
  extend type Query {
    searchPassengers(input: SearchPassengerInput!): [Passenger!]!
  }
`;

export const resolvers = {
  Query: {
    searchPassengers: async (_parent: unknown, args: { input: SearchPassengerInput }) => {
      return await searchPassengers(args.input);
    },
  },
};
