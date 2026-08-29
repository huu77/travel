export interface SearchPassengerInput {
  search: string;
  orderBy: string;
  order: string;
  page: number;
  limit: number;
}

export interface PassengerSearchResult {
  passengerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}
