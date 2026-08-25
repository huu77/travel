import { GraphQLError } from 'graphql';
import { prisma } from '@/prisma.js';
import { generateAccessToken, verifyRefreshToken } from '@shared/token.js';

export interface RefreshTokenResponse {
  accessToken: string;
}

const refreshAccessToken = async (refreshToken: string): Promise<RefreshTokenResponse> => {
  let userId: string;
  try {
    const payload = verifyRefreshToken(refreshToken);
    userId = payload.userId;
  } catch (_error) {
    throw new GraphQLError('Refresh token không hợp lệ hoặc đã hết hạn!', {
      extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } },
    });
  }

  const user = await prisma.user.findUnique({
    where: { userId },
    select: { userId: true, customFields: true },
  });

  if (!user) {
    throw new GraphQLError('Người dùng không tồn tại!', {
      extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } },
    });
  }

  const customFields = (user.customFields as Record<string, unknown>) || {};
  if (customFields.refreshToken !== refreshToken) {
    throw new GraphQLError('Refresh token đã bị thu hồi hoặc đã hết hiệu lực!', {
      extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } },
    });
  }

  const newAccessToken = generateAccessToken(user.userId);

  return {
    accessToken: newAccessToken,
  };
};

export default refreshAccessToken;
