import searchFlightsViaProvider from '@/servers/flight/search.js';
import '@/servers/duffel/index.js'; // Kích hoạt nạp Duffel provider

async function testSearchFlight() {
  console.log('====================================================');
  console.log('🚀 BẮT ĐẦU TEST TÌM KIẾM CHUYẾN BAY (DUFFEL SANDBOX)');
  console.log('====================================================\n');

  const testInput = {
    origin: 'SGN', // TP. Hồ Chí Minh (Tân Sơn Nhất)
    destination: 'HAN', // Hà Nội (Nội Bài)
    departureDate: '2026-09-25', // Ngày bay trong tương lai
    adults: 1,
  };

  console.log('📋 Tham số tìm kiếm:', testInput);
  console.log('----------------------------------------------------');

  const result = await searchFlightsViaProvider(testInput);

  console.log('\n----------------------------------------------------');
  console.log('🎉 KẾT QUẢ TRẢ VỀ:');
  console.log(`- Request ID: ${result.offerRequestId}`);
  console.log(`- Tổng số Offers: ${result.totalOffers}`);

  if (result.offers.length > 0) {
    const first = result.offers[0]!;
    console.log('\n✈️ Chi tiết vé đầu tiên:');
    console.log(`  + Hãng bay: ${first.carrier.name} (${first.carrier.iataCode})`);
    console.log(`  + Giá vé: ${first.totalAmount} ${first.currency}`);
    console.log(`  + Thời hạn giữ vé: ${first.expiresAt}`);
    console.log(
      `  + Chặng bay: ${first.slices[0]?.origin.iataCode} ➡️ ${first.slices[0]?.destination.iataCode}`,
    );
    console.log(`  + Thời lượng bay: ${first.slices[0]?.duration}`);
    console.log(`  + Số hiệu: ${first.slices[0]?.segments[0]?.flightNumber}`);
  }

  console.log('\n====================================================');
  console.log('✅ TEST TÌM KIẾM CHUYẾN BAY HOÀN TẤT THÀNH CÔNG!');
  console.log('====================================================');
}

testSearchFlight().catch((err) => {
  console.error('❌ Lỗi khi test:', err);
  process.exit(1);
});
