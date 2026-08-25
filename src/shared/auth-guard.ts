import { GraphQLError } from 'graphql';
import type { CurrentUser, GraphQLContext } from '../types/context.js';

export function requireAuth(context: GraphQLContext): CurrentUser {
  if (!context.currentUser) {
    throw new GraphQLError('API này yêu cầu bạn phải đăng nhập!', {
      extensions: {
        code: 'UNAUTHENTICATED',
        http: { status: 401 },
      },
    });
  }
  return context.currentUser;
}
