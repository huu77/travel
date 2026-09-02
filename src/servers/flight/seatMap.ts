import { FlightProviderRegistry } from '@/shared/provider.js';
import { prisma } from '@/prisma.js';
import { GraphQLError } from 'graphql';
import type { SeatMapResult } from '@/types/seat.js';

const isUUID = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

async function resolveProvider(providerId?: string | null) {
  if (providerId) {
    if (isUUID(providerId)) {
      const provider = await prisma.provider.findFirst({
        where: {
          providerId,
          deletedAt: null,
        },
        select: {
          providerId: true,
          code: true,
          name: true,
        },
      });
      if (provider) return provider;
    } else {
      const provider = await prisma.provider.findFirst({
        where: {
          code: providerId.toLowerCase(),
          deletedAt: null,
        },
        select: {
          providerId: true,
          code: true,
          name: true,
        },
      });
      if (provider) return provider;
    }
  }

  const defaultProvider = await prisma.provider.findFirst({
    where: {
      type: 'FLIGHT',
      code: 'duffel',
      deletedAt: null,
    },
    select: {
      providerId: true,
      code: true,
      name: true,
    },
  });

  if (defaultProvider) return defaultProvider;

  const anyFlightProvider = await prisma.provider.findFirst({
    where: {
      type: 'FLIGHT',
      deletedAt: null,
    },
    select: {
      providerId: true,
      code: true,
      name: true,
    },
  });

  if (!anyFlightProvider) {
    throw new GraphQLError(
      'Không tìm thấy bất kỳ Provider vé máy bay nào khả dụng trong hệ thống!',
      {
        extensions: { code: 'PROVIDER_NOT_FOUND', http: { status: 400 } },
      },
    );
  }

  return anyFlightProvider;
}

async function getSeatMaps(offerId: string, providerId?: string | null): Promise<SeatMapResult[]> {
  console.log(
    `💺 [SeatMap] Bắt đầu lấy sơ đồ ghế cho Offer ID: ${offerId}, Provider ID: ${providerId || '(Tự động nhận diện)'}`,
  );

  const provider = await resolveProvider(providerId);
  const providerCode = provider.code.trim().toLowerCase();
  console.log(
    `🔌 [SeatMap] Đã xác định Provider: [${providerCode.toUpperCase()}] - ${provider.name}`,
  );

  const flightProvider = FlightProviderRegistry.get(providerCode);
  if (!flightProvider || !flightProvider.getSeatMap) {
    throw new GraphQLError(
      `Nhà cung cấp "${provider.name || providerCode}" không hỗ trợ tính năng lấy sơ đồ ghế ngồi!`,
      { extensions: { code: 'SEAT_MAP_NOT_SUPPORTED', http: { status: 400 } } },
    );
  }

  try {
    const seatMaps = await flightProvider.getSeatMap(offerId);
    console.log(
      `✅ [SeatMap] Lấy thành công ${seatMaps.length} sơ đồ ghế từ Provider "${providerCode}"!`,
    );
    return seatMaps;
  } catch (error) {
    console.error(
      `❌ [SeatMap Error] Lỗi khi lấy sơ đồ ghế từ Provider "${providerCode}":`,
      error instanceof Error ? error.message : error,
    );
    throw error;
  }
}

export default getSeatMaps;
