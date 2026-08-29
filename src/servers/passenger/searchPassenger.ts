import { prisma } from '@/prisma.js';
import { PassengerSearchResult, SearchPassengerInput } from '@/types/passenger.js';

export const buildFilter = (input: SearchPassengerInput) => {
  const whereClauses: string[] = [];

  const search = input.search?.trim();
  if (search) {
    const safeSearch = search.replace(/'/g, "''");
    whereClauses.push(
      `AND ((p."firstName" || ' ' || p."lastName") ILIKE '%${safeSearch}%' OR u.email ILIKE '%${safeSearch}%' OR u.phone ILIKE '%${safeSearch}%')`,
    );
  }

  let orderClause = 'ORDER BY p."createdAt" DESC';
  if (input.orderBy) {
    const allowedColumns: Record<string, string> = {
      firstName: 'p."firstName"',
      lastName: 'p."lastName"',
      createdAt: 'p."createdAt"',
      updatedAt: 'p."updatedAt"',
    };
    const col = allowedColumns[input.orderBy] || 'p."createdAt"';
    const direction = input.order?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    orderClause = `ORDER BY ${col} ${direction}`;
  }

  const page = Math.max(1, Number(input.page) || 1);
  const limit = Math.max(1, Number(input.limit) || 10);
  const offset = (page - 1) * limit;

  const paginationClause = `LIMIT ${limit} OFFSET ${offset}`;

  return {
    where: whereClauses.join(' '),
    order: orderClause,
    pagination: paginationClause,
  };
};

const searchPassengers = async (input: SearchPassengerInput): Promise<PassengerSearchResult[]> => {
  const { where, order, pagination } = buildFilter(input);

  const query = `
    SELECT 
      p."passengerId",
      p."firstName",
      p."lastName",
      COALESCE(u.email, '') as email,
      COALESCE(u.phone, '') as "phoneNumber"
    FROM passengers p
    LEFT JOIN users u ON p."userId" = u."userId"
    WHERE p."deletedAt" IS NULL ${where}
    ${order}
    ${pagination}
  `;

  const result = await prisma.$queryRawUnsafe<PassengerSearchResult[]>(query);
  return result;
};

export default searchPassengers;
