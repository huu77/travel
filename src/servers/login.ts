import argon2 from 'argon2';
import { GraphQLError } from 'graphql';
import { prisma } from '../prisma.js';
import { generateAccessToken, generateRefreshToken } from '../shared/token.js';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

const checkUserExists = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { userId: true, email: true, customFields: true, password: true },
  });

  if (!user) {
    throw new GraphQLError('Email hoặc mật khẩu không chính xác', {
      extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } },
    });
  }

  return user;
};

const checkPassword = async (hashedPassword: string, password: string) => {
  const isValidPassword = await argon2.verify(hashedPassword, password);
  if (!isValidPassword) {
    throw new GraphQLError('Email hoặc mật khẩu không chính xác', {
      extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } },
    });
  }
};

const authentication = async (input: {
  email: string;
  password: string;
}): Promise<LoginResponse> => {
  const user = await checkUserExists(input.email);
  await checkPassword(user.password, input.password);

  const accessToken = generateAccessToken(user.userId);
  const refreshToken = generateRefreshToken(user.userId);
  const loginAt = new Date().toISOString();

  const currentCustomFields = (user.customFields as Record<string, unknown>) || {};

  await prisma.user.update({
    where: { userId: user.userId },
    data: {
      customFields: {
        ...currentCustomFields,
        refreshToken,
        loginAt,
      },
    },
  });

  return {
    accessToken,
    refreshToken,
  };
};

export default authentication;
