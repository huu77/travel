import getSeatMaps from '@/servers/flight/seatMap.js';

export const typeDefs = `#graphql
  type SeatAvailableService {
    serviceId: String!
    totalAmount: String!
    totalCurrency: String!
  }

  type SeatElement {
    type: String!
    designator: String
    name: String
    disclosures: [String!]
    availableServices: [SeatAvailableService!]
  }

  type SeatRowSection {
    elements: [SeatElement!]!
  }

  type SeatRow {
    sections: [SeatRowSection!]!
  }

  type SeatWings {
    firstRowIndex: Int!
    lastRowIndex: Int!
  }

  type SeatCabin {
    cabinClass: String!
    deck: Int!
    wings: SeatWings
    rows: [SeatRow!]!
  }

  type SeatMapResult {
    id: ID!
    sliceId: ID!
    segmentId: ID!
    cabins: [SeatCabin!]!
  }

  extend type Query {
    getSeatMaps(offerId: ID!, providerId: ID): [SeatMapResult!]!
  }
`;

export const resolvers = {
  Query: {
    getSeatMaps: async (
      _parent: unknown,
      args: { offerId: string; providerId?: string | null },
    ) => {
      return await getSeatMaps(args.offerId, args.providerId);
    },
  },
};
