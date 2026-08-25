import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const seedEmails = ['an.nguyen@example.com', 'linh.tran@example.com', 'minh.pham@example.com'];

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
        customField: { seed: true },
      },
      {
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        decimalDigits: 2,
        customField: { seed: true },
      },
      {
        code: 'SGD',
        name: 'Singapore Dollar',
        symbol: 'S$',
        decimalDigits: 2,
        customField: { seed: true },
      },
    ],
    skipDuplicates: true,
  });
}

async function main() {
  await clearSeedData();
  await seedCurrencies();

  const an = await prisma.user.create({
    data: {
      email: 'an.nguyen@example.com',
      password: 'AnPassword123!',
      firstName: 'An',
      lastName: 'Nguyen',
      phone: '+84901234567',
      customField: {
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
            customField: { seed: true, seatPreference: 'aisle' },
          },
          {
            type: 'CHILD',
            firstName: 'Bao',
            lastName: 'Nguyen',
            dateOfBirth: new Date('2017-08-09'),
            gender: 'male',
            nationality: 'VN',
            customField: { seed: true, meal: 'child' },
          },
        ],
      },
    },
    include: { passengers: true },
  });

  const linh = await prisma.user.create({
    data: {
      email: 'linh.tran@example.com',
      password: 'LinhPassword123!',
      firstName: 'Linh',
      lastName: 'Tran',
      phone: '+84987654321',
      customField: {
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
            customField: { seed: true, seatPreference: 'window' },
          },
        ],
      },
    },
    include: { passengers: true },
  });

  const minh = await prisma.user.create({
    data: {
      email: 'minh.pham@example.com',
      password: 'MinhPassword123!',
      firstName: 'Minh',
      lastName: 'Pham',
      phone: '+84922334455',
      customField: {
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
            customField: { seed: true },
          },
          {
            type: 'INFANT',
            firstName: 'Mai',
            lastName: 'Pham',
            dateOfBirth: new Date('2025-01-18'),
            gender: 'female',
            nationality: 'VN',
            customField: { seed: true, requiresBassinet: true },
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
      providerBookingId: 'DUF-SEED-1001',
      status: 'CONFIRMED',
      totalAmount: '3850000',
      currency: 'VND',
      customField: {
        seed: true,
        route: 'SGN-HAN',
        airline: 'Vietnam Airlines',
        flightNumber: 'VN216',
        departureAt: '2026-09-12T07:30:00+07:00',
        arrivalAt: '2026-09-12T09:40:00+07:00',
      },
      bookingPassengers: {
        create: an.passengers.map((passenger) => ({
          passengerId: passenger.passengerId,
          customField: {
            seed: true,
            snapshotName: `${passenger.firstName} ${passenger.lastName}`,
          },
        })),
      },
    },
  });

  const bookingTwo = await prisma.booking.create({
    data: {
      userId: linh.userId,
      provider: 'duffel',
      providerBookingId: 'DUF-SEED-1002',
      status: 'PENDING',
      totalAmount: '420.50',
      currency: 'USD',
      customField: {
        seed: true,
        route: 'SGN-SIN',
        airline: 'Singapore Airlines',
        flightNumber: 'SQ185',
        departureAt: '2026-10-03T19:40:00+07:00',
        arrivalAt: '2026-10-03T22:50:00+08:00',
      },
      bookingPassengers: {
        create: linh.passengers.map((passenger) => ({
          passengerId: passenger.passengerId,
          customField: {
            seed: true,
            snapshotName: `${passenger.firstName} ${passenger.lastName}`,
          },
        })),
      },
    },
  });

  const bookingThree = await prisma.booking.create({
    data: {
      userId: minh.userId,
      provider: 'duffel',
      providerBookingId: 'DUF-SEED-1003',
      status: 'CANCELLED',
      totalAmount: '2150000',
      currency: 'VND',
      customField: {
        seed: true,
        route: 'HAN-DAD',
        airline: 'Vietjet Air',
        flightNumber: 'VJ501',
        cancellationReason: 'Customer requested itinerary change',
      },
      bookingPassengers: {
        create: minh.passengers.map((passenger) => ({
          passengerId: passenger.passengerId,
          customField: {
            seed: true,
            snapshotName: `${passenger.firstName} ${passenger.lastName}`,
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
      customField: { seed: true, paymentMethod: 'card' },
      entries: {
        create: [
          {
            accountType: 'USER',
            accountId: an.userId,
            direction: 'DEBIT',
            amount: '3850000',
            currency: 'VND',
            customField: { seed: true, memo: 'Customer payment' },
          },
          {
            accountType: 'PLATFORM',
            accountId: platformAccountId,
            direction: 'CREDIT',
            amount: '3850000',
            currency: 'VND',
            customField: { seed: true, memo: 'Platform received payment' },
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
      customField: { seed: true, paymentMethod: 'bank_transfer' },
      entries: {
        create: [
          {
            accountType: 'USER',
            accountId: linh.userId,
            direction: 'DEBIT',
            amount: '420.50',
            currency: 'USD',
            customField: { seed: true, memo: 'Awaiting settlement' },
          },
          {
            accountType: 'PROVIDER',
            accountId: providerAccountId,
            direction: 'CREDIT',
            amount: '420.50',
            currency: 'USD',
            customField: { seed: true, memo: 'Provider receivable' },
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
      customField: { seed: true, refundReason: 'Cancelled booking' },
      entries: {
        create: [
          {
            accountType: 'PLATFORM',
            accountId: platformAccountId,
            direction: 'DEBIT',
            amount: '2150000',
            currency: 'VND',
            customField: { seed: true, memo: 'Platform issued refund' },
          },
          {
            accountType: 'USER',
            accountId: minh.userId,
            direction: 'CREDIT',
            amount: '2150000',
            currency: 'VND',
            customField: { seed: true, memo: 'Customer refund' },
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
