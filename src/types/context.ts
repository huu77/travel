export interface CurrentUser {
  userId: string;
}

export interface GraphQLContext {
  currentUser: CurrentUser | null;
}
