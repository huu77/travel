import searchPassengers from '@/servers/passenger/searchPassenger.js';
import { SearchPassengerInput } from '@/types/passenger.js';
import { prisma } from '@/prisma.js';
import { requireAuth } from '@/shared/auth-guard.js';
import type { GraphQLContext } from '@/types/context.js';
import { GraphQLError } from 'graphql';

export const typeDefs = `#graphql
  enum PassengerTypeEnum {
    ADULT
    CHILD
    INFANT
  }

  input SearchPassengerInput {
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

  type PassengerRecord {
    passengerId: ID!
    userId: ID!
    type: PassengerTypeEnum!
    firstName: String!
    lastName: String!
    dateOfBirth: String
    gender: String
    nationality: String
    passportNumber: String
    passportCountry: String
    passportExpiryDate: String
    createdAt: String!
    updatedAt: String!
  }

  input CreatePassengerInput {
    type: PassengerTypeEnum
    firstName: String!
    lastName: String!
    dateOfBirth: String
    gender: String
    nationality: String
    passportNumber: String!
    passportCountry: String
    passportExpiryDate: String
  }

  input UpdatePassengerInput {
    type: PassengerTypeEnum
    firstName: String
    lastName: String
    dateOfBirth: String
    gender: String
    nationality: String
    passportNumber: String
    passportCountry: String
    passportExpiryDate: String
  }
 
  extend type Query {
    searchPassengers(input: SearchPassengerInput!): [Passenger!]!
    getMyPassengers: [PassengerRecord!]!
  }

  extend type Mutation {
    createPassenger(input: CreatePassengerInput!): PassengerRecord!
    updatePassenger(passengerId: ID!, input: UpdatePassengerInput!): PassengerRecord!
    deletePassenger(passengerId: ID!): Boolean!
  }
`;

export const resolvers = {
  Query: {
    searchPassengers: async (_parent: unknown, args: { input: SearchPassengerInput }) => {
      return await searchPassengers(args.input);
    },

    getMyPassengers: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ): Promise<any[]> => {
      const currentUser = requireAuth(context);
      const passengers = await prisma.passenger.findMany({
        where: {
          userId: currentUser.userId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      return passengers.map((p) => ({
        ...p,
        dateOfBirth: p.dateOfBirth?.toISOString() || null,
        passportExpiryDate: p.passportExpiryDate?.toISOString() || null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }));
    },
  },

  Mutation: {
    createPassenger: async (_parent: unknown, args: { input: any }, context: GraphQLContext) => {
      const currentUser = requireAuth(context);
      const { input } = args;

      const newPassenger = await prisma.passenger.create({
        data: {
          userId: currentUser.userId,
          type: input.type || 'ADULT',
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
          gender: input.gender || 'male',
          nationality: (input.nationality || 'VN').toUpperCase(),
          passportNumber: input.passportNumber.trim(),
          passportCountry: (input.passportCountry || 'VN').toUpperCase(),
          passportExpiryDate: input.passportExpiryDate ? new Date(input.passportExpiryDate) : null,
        },
      });

      return {
        ...newPassenger,
        dateOfBirth: newPassenger.dateOfBirth?.toISOString() || null,
        passportExpiryDate: newPassenger.passportExpiryDate?.toISOString() || null,
        createdAt: newPassenger.createdAt.toISOString(),
        updatedAt: newPassenger.updatedAt.toISOString(),
      };
    },

    updatePassenger: async (
      _parent: unknown,
      args: { passengerId: string; input: any },
      context: GraphQLContext,
    ) => {
      const currentUser = requireAuth(context);
      const { passengerId, input } = args;

      const existing = await prisma.passenger.findFirst({
        where: { passengerId, userId: currentUser.userId, deletedAt: null },
      });

      if (!existing) {
        throw new GraphQLError('Không tìm thấy thông tin hành khách hoặc bạn không có quyền sửa!', {
          extensions: { code: 'NOT_FOUND', http: { status: 404 } },
        });
      }

      const updated = await prisma.passenger.update({
        where: { passengerId },
        data: {
          ...(input.type ? { type: input.type } : {}),
          ...(input.firstName ? { firstName: input.firstName.trim() } : {}),
          ...(input.lastName ? { lastName: input.lastName.trim() } : {}),
          ...(input.dateOfBirth !== undefined
            ? { dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null }
            : {}),
          ...(input.gender ? { gender: input.gender } : {}),
          ...(input.nationality ? { nationality: input.nationality.toUpperCase() } : {}),
          ...(input.passportNumber ? { passportNumber: input.passportNumber.trim() } : {}),
          ...(input.passportCountry
            ? { passportCountry: input.passportCountry.toUpperCase() }
            : {}),
          ...(input.passportExpiryDate !== undefined
            ? {
                passportExpiryDate: input.passportExpiryDate
                  ? new Date(input.passportExpiryDate)
                  : null,
              }
            : {}),
        },
      });

      return {
        ...updated,
        dateOfBirth: updated.dateOfBirth?.toISOString() || null,
        passportExpiryDate: updated.passportExpiryDate?.toISOString() || null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    },

    deletePassenger: async (
      _parent: unknown,
      args: { passengerId: string },
      context: GraphQLContext,
    ) => {
      const currentUser = requireAuth(context);
      const { passengerId } = args;

      await prisma.passenger.updateMany({
        where: { passengerId, userId: currentUser.userId },
        data: { deletedAt: new Date() },
      });

      return true;
    },
  },
};
