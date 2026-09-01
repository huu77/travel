import { searchDuffelPlaces } from '@/servers/duffel/places.js';

export const typeDefs = `#graphql
  type PlaceLocation {
    id: ID!
    iataCode: String
    name: String!
    cityName: String
    countryName: String
    type: String!
    latitude: Float
    longitude: Float
  }

  extend type Query {
    searchPlaces(query: String!): [PlaceLocation!]!
  }
`;

export const resolvers = {
  Query: {
    searchPlaces: async (_parent: unknown, args: { query: string }) => {
      return await searchDuffelPlaces(args.query);
    },
  },
};
