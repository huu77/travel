import { prisma } from '@/prisma.js';
import { BookingSearchResult, SearchBookingsInput } from '@/types/booking.js';

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;

export const buildFilter = (input: SearchBookingsInput) => {
  const where: string[] = [];

  if (input.search) {
    const safeSearch = input.search.trim().replace(/'/g, "''");
    where.push(
      `(COALESCE(b."customFields"->'flightSnapshot'->>'bookingReference', b."providerBookingId", '') ILIKE '%${safeSearch}%')`,
    );
  }

  if (input.status) {
    const safeStatus = input.status.trim().replace(/'/g, "''");
    where.push(`b."status" = '${safeStatus}'`);
  }

  let order = 'ORDER BY b."createdAt" DESC';
  if (input.orderBy) {
    const allowedColumns: Record<string, string> = {
      bookingReference: 'b."createdAt"',
      status: 'b."status"',
      totalAmount: 'b."totalAmount"',
      createdAt: 'b."createdAt"',
      updatedAt: 'b."updatedAt"',
    };
    const col = allowedColumns[input.orderBy] || 'b."createdAt"';
    const direction = input.order?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    order = `ORDER BY ${col} ${direction}`;
  }

  const page = Math.max(1, Number(input.page) || DEFAULT_PAGE);
  const limit = Math.max(1, Number(input.limit) || DEFAULT_LIMIT);
  const offset = (page - 1) * limit;

  return {
    where: where.join(' AND '),
    order,
    pagination: `LIMIT ${limit} OFFSET ${offset}`,
  };
};

function getBookings(input: SearchBookingsInput, userId: string): Promise<BookingSearchResult[]> {
  const { where, order, pagination } = buildFilter(input);
  const query = `
    SELECT 
      b."bookingId",
      COALESCE(b."customFields"->'flightSnapshot'->>'bookingReference', b."providerBookingId", '') as "bookingReference",
      b."provider",
      b."status",
      b."totalAmount"::text as "totalAmount",
      b."currency",
      b."createdAt"::text as "createdAt",
      b."updatedAt"::text as "updatedAt"
    FROM bookings b
    WHERE b."deletedAt" IS NULL 
    AND b."userId" = '${userId}'::uuid
    ${where ? 'AND ' + where : ''}
    ${order}
    ${pagination}
  `;

  return prisma.$queryRawUnsafe<BookingSearchResult[]>(query);
}

export default getBookings;
