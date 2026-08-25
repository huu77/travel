import type { User } from '@/generated/prisma/client.js';
import { prisma } from '@/prisma.js';
import { GraphQLError } from 'graphql';

export interface ProfileResponse {
  user: User;
}

const getUserProfile = async (userId: string): Promise<ProfileResponse> => {
  const user = await prisma.user.findUnique({
    where: {
      userId,
    },
  });

  if (!user) {
    throw new GraphQLError('Người dùng không tồn tại!', {
      extensions: {
        code: 'UNAUTHENTICATED',
        http: { status: 401 },
      },
    });
  }

  // sau này cần mở rộng thêm
  return { user };
};

export default getUserProfile;
