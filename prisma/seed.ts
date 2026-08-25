import argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { env } from '../src/shared/env.js';

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const seedEmails = ['an.nguyen@example.com', 'linh.tran@example.com', 'minh.pham@example.com'];
const SEED_PASSWORD = 'Password123!';

const platformAccountId = '00000000-0000-4000-8000-000000000001';
const providerAccountId = '00000000-0000-4000-8000-000000000002';

async function clearSeedData() {
  const users = await prisma.user.findMany({
    where: { email: { in: seedEmails } },
    select: { userId: true },
  });

  const userIds = users.map((user) => user.userId);

  if (userIds.length === 0) {
    return;
  }

  const bookings = await prisma.booking.findMany({
    where: { userId: { in: userIds } },
    select: { bookingId: true },
  });

  const bookingIds = bookings.map((booking) => booking.bookingId);

  const transactions = await prisma.transaction.findMany({
    where: {
      OR: [{ userId: { in: userIds } }, { bookingId: { in: bookingIds } }],
    },
    select: { transactionId: true },
  });

  const transactionIds = transactions.map((transaction) => transaction.transactionId);

  await prisma.$transaction([
    prisma.transactionEntry.deleteMany({
      where: { transactionId: { in: transactionIds } },
    }),
    prisma.transaction.deleteMany({
      where: { transactionId: { in: transactionIds } },
    }),
    prisma.bookingPassenger.deleteMany({
      where: { bookingId: { in: bookingIds } },
    }),
    prisma.booking.deleteMany({
      where: { bookingId: { in: bookingIds } },
    }),
    prisma.passenger.deleteMany({
      where: { userId: { in: userIds } },
    }),
    prisma.user.deleteMany({
      where: { userId: { in: userIds } },
    }),
  ]);
}

async function seedCurrencies() {
  await prisma.currency.createMany({
    data: [
      {
        code: 'VND',
        name: 'Vietnamese Dong',
        symbol: 'VND',
        decimalDigits: 0,
        customFields: { seed: true },
      },
      {
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        decimalDigits: 2,
        customFields: { seed: true },
      },
      {
        code: 'SGD',
        name: 'Singapore Dollar',
        symbol: 'S$',
        decimalDigits: 2,
        customFields: { seed: true },
      },
    ],
    skipDuplicates: true,
  });
}

async function seedProviders() {
  await prisma.provider.createMany({
    data: [
      {
        providerId: '00000000-0000-4000-9000-000000000001',
        code: 'duffel',
        name: 'Duffel Flights API',
        type: 'FLIGHT',
        description: 'Global flight search, hold orders and ticketing',
        customFields: { seed: true, apiVersion: 'v2', environment: 'sandbox' },
      },
      {
        providerId: '00000000-0000-4000-9000-000000000002',
        code: 'stripe',
        name: 'Stripe Payments',
        type: 'PAYMENT',
        description: 'Global card payments and refunds',
        customFields: { seed: true, currency: 'USD' },
      },
      {
        providerId: '00000000-0000-4000-9000-000000000003',
        code: 'amadeus',
        name: 'Amadeus GDS',
        type: 'FLIGHT',
        description: 'Global Distribution System',
        customFields: { seed: true },
      },
      {
        providerId: '00000000-0000-4000-9000-000000000004',
        code: 'vnpay',
        name: 'VNPay Gateway',
        type: 'PAYMENT',
        description: 'Vietnam domestic QR and banking payment',
        customFields: { seed: true, currency: 'VND' },
      },
    ],
    skipDuplicates: true,
  });
}

async function main() {
  await clearSeedData();
  await seedProviders();
  await seedCurrencies();

  const hashedPassword = await argon2.hash(SEED_PASSWORD);

  const an = await prisma.user.create({
    data: {
      email: 'an.nguyen@example.com',
      password: hashedPassword,
      firstName: 'An',
      lastName: 'Nguyen',
      phone: '+84901234567',
      passportNumber: 'B1234567',
      passportCountry: 'VN',
      passportExpiryDate: new Date('2030-05-20'),
      customFields: {
        seed: true,
        tier: 'gold',
        preferredLanguage: 'vi',
      },
      passengers: {
        create: [
          {
            type: 'ADULT',
            firstName: 'An',
            lastName: 'Nguyen',
            dateOfBirth: new Date('1992-03-14'),
            gender: 'male',
            nationality: 'VN',
            passportNumber: 'B1234567',
            passportCountry: 'VN',
            passportExpiryDate: new Date('2030-05-20'),
            customFields: { seed: true, seatPreference: 'aisle' },
          },
          {
            type: 'CHILD',
            firstName: 'Bao',
            lastName: 'Nguyen',
            dateOfBirth: new Date('2017-08-09'),
            gender: 'male',
            nationality: 'VN',
            customFields: { seed: true, meal: 'child' },
          },
        ],
      },
    },
    include: { passengers: true },
  });

  const linh = await prisma.user.create({
    data: {
      email: 'linh.tran@example.com',
      password: hashedPassword,
      firstName: 'Linh',
      lastName: 'Tran',
      phone: '+84987654321',
      passportNumber: 'C7654321',
      passportCountry: 'VN',
      passportExpiryDate: new Date('2031-01-15'),
      customFields: {
        seed: true,
        tier: 'silver',
        preferredLanguage: 'en',
      },
      passengers: {
        create: [
          {
            type: 'ADULT',
            firstName: 'Linh',
            lastName: 'Tran',
            dateOfBirth: new Date('1989-11-22'),
            gender: 'female',
            nationality: 'VN',
            passportNumber: 'C7654321',
            passportCountry: 'VN',
            passportExpiryDate: new Date('2031-01-15'),
            customFields: { seed: true, seatPreference: 'window' },
          },
        ],
      },
    },
    include: { passengers: true },
  });

  const minh = await prisma.user.create({
    data: {
      email: 'minh.pham@example.com',
      password: hashedPassword,
      firstName: 'Minh',
      lastName: 'Pham',
      phone: '+84922334455',
      passportNumber: 'D9988776',
      passportCountry: 'VN',
      passportExpiryDate: new Date('2032-10-10'),
      customFields: {
        seed: true,
        tier: 'standard',
        preferredLanguage: 'vi',
      },
      passengers: {
        create: [
          {
            type: 'ADULT',
            firstName: 'Minh',
            lastName: 'Pham',
            dateOfBirth: new Date('1995-06-02'),
            gender: 'male',
            nationality: 'VN',
            customFields: { seed: true },
          },
          {
            type: 'INFANT',
            firstName: 'Mai',
            lastName: 'Pham',
            dateOfBirth: new Date('2025-01-18'),
            gender: 'female',
            nationality: 'VN',
            customFields: { seed: true, requiresBassinet: true },
          },
        ],
      },
    },
    include: { passengers: true },
  });

  const bookingOne = await prisma.booking.create({
    data: {
      userId: an.userId,
      provider: 'duffel',
      providerBookingId: 'ord_0000A1B2C3D4E5F6',
      status: 'CONFIRMED',
      totalAmount: '3850000',
      currency: 'VND',
      customFields: {
        seed: true,
        provider: 'duffel',
        duffelOfferId: 'off_00009htYpSCXrwaCd9wbX1',
        bookingReference: 'VN789X',
        cabinClass: 'economy',
        paymentRequiredBy: '2026-09-12T05:00:00Z',
        route: 'SGN-HAN',
        flight: {
          airline: 'Vietnam Airlines',
          airlineCode: 'VN',
          flightNumber: 'VN216',
          aircraft: 'Boeing 787-9',
          cabinClass: 'economy',
        },
        slices: [
          {
            origin: 'SGN',
            originName: 'Tan Son Nhat International Airport',
            destination: 'HAN',
            destinationName: 'Noi Bai International Airport',
            departureAt: '2026-09-12T07:30:00+07:00',
            arrivalAt: '2026-09-12T09:40:00+07:00',
            duration: 'PT2H10M',
          },
        ],
      },
      bookingPassengers: {
        create: an.passengers.map((passenger, index) => ({
          passengerId: passenger.passengerId,
          customFields: {
            seed: true,
            duffelPassengerId: `pas_0000A1B2C3D${index + 1}`,
            snapshotName: `${passenger.firstName} ${passenger.lastName}`,
            type: passenger.type,
            gender: passenger.gender,
            nationality: passenger.nationality,
            passportNumber: passenger.passportNumber,
          },
        })),
      },
    },
  });

  const bookingTwo = await prisma.booking.create({
    data: {
      userId: linh.userId,
      provider: 'duffel',
      providerBookingId: 'ord_0000A1B2C3D4E5F7',
      status: 'PENDING',
      totalAmount: '420.50',
      currency: 'USD',
      customFields: {
        seed: true,
        provider: 'duffel',
        duffelOfferId: 'off_00009htYpSCXrwaCd9wbX2',
        bookingReference: 'SQ456Y',
        cabinClass: 'business',
        paymentRequiredBy: '2026-10-03T17:00:00Z',
        route: 'SGN-SIN',
        flight: {
          airline: 'Singapore Airlines',
          airlineCode: 'SQ',
          flightNumber: 'SQ185',
          aircraft: 'Airbus A350-900',
          cabinClass: 'business',
        },
        slices: [
          {
            origin: 'SGN',
            originName: 'Tan Son Nhat International Airport',
            destination: 'SIN',
            destinationName: 'Singapore Changi Airport',
            departureAt: '2026-10-03T19:40:00+07:00',
            arrivalAt: '2026-10-03T22:50:00+08:00',
            duration: 'PT2H10M',
          },
        ],
      },
      bookingPassengers: {
        create: linh.passengers.map((passenger, index) => ({
          passengerId: passenger.passengerId,
          customFields: {
            seed: true,
            duffelPassengerId: `pas_0000B1B2C3D${index + 1}`,
            snapshotName: `${passenger.firstName} ${passenger.lastName}`,
            type: passenger.type,
            gender: passenger.gender,
            nationality: passenger.nationality,
            passportNumber: passenger.passportNumber,
          },
        })),
      },
    },
  });

  const bookingThree = await prisma.booking.create({
    data: {
      userId: minh.userId,
      provider: 'duffel',
      providerBookingId: 'ord_0000A1B2C3D4E5F8',
      status: 'CANCELLED',
      totalAmount: '2150000',
      currency: 'VND',
      customFields: {
        seed: true,
        provider: 'duffel',
        duffelOfferId: 'off_00009htYpSCXrwaCd9wbX3',
        bookingReference: 'VJ123Z',
        cabinClass: 'economy',
        cancellationReason: 'Customer requested itinerary change',
        route: 'HAN-DAD',
        flight: {
          airline: 'Vietjet Air',
          airlineCode: 'VJ',
          flightNumber: 'VJ501',
          aircraft: 'Airbus A321',
          cabinClass: 'economy',
        },
        slices: [
          {
            origin: 'HAN',
            originName: 'Noi Bai International Airport',
            destination: 'DAD',
            destinationName: 'Da Nang International Airport',
            departureAt: '2026-10-15T06:00:00+07:00',
            arrivalAt: '2026-10-15T07:20:00+07:00',
            duration: 'PT1H20M',
          },
        ],
      },
      bookingPassengers: {
        create: minh.passengers.map((passenger, index) => ({
          passengerId: passenger.passengerId,
          customFields: {
            seed: true,
            duffelPassengerId: `pas_0000C1B2C3D${index + 1}`,
            snapshotName: `${passenger.firstName} ${passenger.lastName}`,
            type: passenger.type,
            gender: passenger.gender,
            nationality: passenger.nationality,
            passportNumber: passenger.passportNumber,
          },
        })),
      },
    },
  });

  await prisma.transaction.create({
    data: {
      userId: an.userId,
      bookingId: bookingOne.bookingId,
      type: 'PAYMENT',
      status: 'SUCCESS',
      amount: '3850000',
      currency: 'VND',
      provider: 'stripe',
      providerTransactionId: 'pi_seed_1001',
      customFields: { seed: true, paymentMethod: 'card' },
      entries: {
        create: [
          {
            accountType: 'USER',
            accountId: an.userId,
            direction: 'DEBIT',
            amount: '3850000',
            currency: 'VND',
            customFields: { seed: true, memo: 'Customer payment' },
          },
          {
            accountType: 'PLATFORM',
            accountId: platformAccountId,
            direction: 'CREDIT',
            amount: '3850000',
            currency: 'VND',
            customFields: { seed: true, memo: 'Platform received payment' },
          },
        ],
      },
    },
  });

  await prisma.transaction.create({
    data: {
      userId: linh.userId,
      bookingId: bookingTwo.bookingId,
      type: 'PAYMENT',
      status: 'PENDING',
      amount: '420.50',
      currency: 'USD',
      provider: 'stripe',
      providerTransactionId: 'pi_seed_1002',
      customFields: { seed: true, paymentMethod: 'bank_transfer' },
      entries: {
        create: [
          {
            accountType: 'USER',
            accountId: linh.userId,
            direction: 'DEBIT',
            amount: '420.50',
            currency: 'USD',
            customFields: { seed: true, memo: 'Awaiting settlement' },
          },
          {
            accountType: 'PROVIDER',
            accountId: providerAccountId,
            direction: 'CREDIT',
            amount: '420.50',
            currency: 'USD',
            customFields: { seed: true, memo: 'Provider receivable' },
          },
        ],
      },
    },
  });

  await prisma.transaction.create({
    data: {
      userId: minh.userId,
      bookingId: bookingThree.bookingId,
      type: 'REFUND',
      status: 'SUCCESS',
      amount: '2150000',
      currency: 'VND',
      provider: 'stripe',
      providerTransactionId: 're_seed_1003',
      customFields: { seed: true, refundReason: 'Cancelled booking' },
      entries: {
        create: [
          {
            accountType: 'PLATFORM',
            accountId: platformAccountId,
            direction: 'DEBIT',
            amount: '2150000',
            currency: 'VND',
            customFields: { seed: true, memo: 'Platform issued refund' },
          },
          {
            accountType: 'USER',
            accountId: minh.userId,
            direction: 'CREDIT',
            amount: '2150000',
            currency: 'VND',
            customFields: { seed: true, memo: 'Customer refund' },
          },
        ],
      },
    },
  });
}

try {
  await main();
  console.log('Seed data created.');
} finally {
  await prisma.$disconnect();
}
