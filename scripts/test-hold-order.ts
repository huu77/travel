import { prisma } from '@/prisma.js';
import { searchFlightsViaProvider } from '@/servers/flight/search.js';
import { createHoldOrderViaProvider } from '@/servers/flight/holdOrder.js';

async function testHoldOrderFlow() {
  console.log('====================================================');
  console.log('🚀 BẮT ĐẦU TEST TOÀN BỘ LUỒNG TẠO ĐƠN GIỮ CHỖ (HOLD ORDER)');
  console.log('====================================================\n');

  // 1. Tìm User An Nguyen trong database
  const user = await prisma.user.findFirst({
    where: { email: 'an.nguyen@example.com' },
    include: { passengers: true },
  });

  if (!user || user.passengers.length === 0) {
    throw new Error('Không tìm thấy User seed An Nguyen hoặc danh sách hành khách!');
  }

  const adultPassenger = user.passengers.find((p) => p.type === 'ADULT');
  if (!adultPassenger) {
    throw new Error('Không tìm thấy hành khách người lớn trong danh bạ của An!');
  }

  console.log(`👤 User: ${user.firstName} ${user.lastName} (${user.email})`);
  console.log(
    `🎟️ Hành khách: ${adultPassenger.firstName} ${adultPassenger.lastName} (ID: ${adultPassenger.passengerId}, Hộ chiếu: ${adultPassenger.passportNumber})`,
  );

  // 2. Tìm chuyến bay SGN -> DAD
  console.log('\n🔍 Đang tìm chuyến bay SGN -> DAD ngày 2026-10-10...');
  const searchResult = await searchFlightsViaProvider({
    origin: 'SGN',
    destination: 'DAD',
    departureDate: '2026-10-10',
    adults: 1,
  });

  if (!searchResult.offers || searchResult.offers.length === 0) {
    throw new Error('Không tìm thấy vé máy bay nào từ Duffel!');
  }

  const selectedOffer = searchResult.offers[0]!;
  console.log(
    `✅ Đã chọn vé: ${selectedOffer.offerId} của hãng ${selectedOffer.carrier.name} (${selectedOffer.totalAmount} ${selectedOffer.currency})`,
  );

  // 3. Thực hiện Giữ Chỗ (Hold Order)
  console.log('\n🚀 Đang gửi lệnh Giữ Chỗ sang Duffel và Lưu Database...');
  const duffelProvider = await prisma.provider.findFirst({ where: { code: 'duffel' } });
  const holdResult = await createHoldOrderViaProvider(user.userId, {
    providerId: duffelProvider!.providerId,
    offerId: selectedOffer.offerId,
    passengerIds: [adultPassenger.passengerId],
  });

  console.log('\n====================================================');
  console.log('🎉 GIỮ CHỖ THÀNH CÔNG VÀ LƯU DATABASE HOÀN TẤT!');
  console.log('====================================================');
  console.log(`- Booking ID: ${holdResult.bookingId}`);
  console.log(`- Mã PNR Hãng bay (Booking Reference): ${holdResult.bookingReference}`);
  console.log(`- Trạng thái: ${holdResult.status}`);
  console.log(`- Hạn thanh toán (Payment Required By): ${holdResult.paymentRequiredBy}`);
  console.log(`- Tổng tiền: ${holdResult.totalAmount} ${holdResult.currency}`);
  console.log(`- Hãng vận chuyển: ${holdResult.carrier.name} (${holdResult.carrier.iataCode})`);
  console.log(
    `- Hành khách Snapshot: ${holdResult.passengers[0]?.firstName} ${holdResult.passengers[0]?.lastName} (Passport: ${holdResult.passengers[0]?.passportNumber})`,
  );

  // 4. Kiểm tra dữ liệu thực tế trong PostgreSQL
  const dbBooking = await prisma.booking.findUnique({
    where: { bookingId: holdResult.bookingId },
    include: { bookingPassengers: true },
  });

  console.log('\n💾 Dữ liệu thực tế lưu trong PostgreSQL:');
  console.log(`  + Status: ${dbBooking?.status}`);
  console.log(`  + Provider: ${dbBooking?.provider} (Booking ID: ${dbBooking?.providerBookingId})`);
  console.log(`  + Snapshot customFields:`, JSON.stringify(dbBooking?.customFields, null, 2));
  console.log(`  + Booking Passengers count: ${dbBooking?.bookingPassengers.length}`);
}

testHoldOrderFlow()
  .catch((err) => {
    console.error('❌ Lỗi:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
