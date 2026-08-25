import argon2 from 'argon2';
import { GraphQLError } from 'graphql';
import type { Prisma, User } from '@generated/prisma/client.js';
import { prisma } from '@/prisma.js';

interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

type UserWithoutPassword = Omit<User, 'password'>;

const checkEmailExists = async (email: string) => {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new GraphQLError('Email này đã được đăng ký!', {
      extensions: {
        code: 'CONFLICT',
        field: 'email',
        http: { status: 409 },
      },
    });
  }
};

const createNewUser = async (input: RegisterInput): Promise<UserWithoutPassword> => {
  const hashedPassword = await argon2.hash(input.password);

  const userData: Prisma.UserCreateInput = {
    email: input.email,
    password: hashedPassword,
    firstName: input.firstName ?? null,
    lastName: input.lastName ?? null,
    phone: input.phone ?? null,
  };

  const { password, ...newUser } = await prisma.user.create({
    data: userData,
  });

  return newUser;
};

const registerNewUser = async (input: RegisterInput) => {
  await checkEmailExists(input.email);
  return await createNewUser(input);
};

export default registerNewUser;
