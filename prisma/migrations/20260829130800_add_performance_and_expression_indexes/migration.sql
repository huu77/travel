-- 1. Enable pg_trgm extension for Trigram GIN indexes (high performance ILIKE searches)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ==============================================================================
-- 2. LEAN UNIQUE INDEXES (CHỐNG TRÙNG LẶP DỮ LIỆU)
-- ==============================================================================

-- Drop old non-unique index if exists
DROP INDEX IF EXISTS "bookings_provider_providerBookingId_idx";
DROP INDEX IF EXISTS "transactions_provider_providerTransactionId_idx";

-- Unique (provider, providerBookingId) chống duplicate booking từ hãng
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_provider_providerBookingId_key" 
ON "bookings" ("provider", "providerBookingId")
WHERE "providerBookingId" IS NOT NULL;

-- Unique (provider, providerTransactionId) chống duplicate transaction từ cổng thanh toán
CREATE UNIQUE INDEX IF NOT EXISTS "transactions_provider_providerTransactionId_key" 
ON "transactions" ("provider", "providerTransactionId")
WHERE "providerTransactionId" IS NOT NULL;

-- Unique phone cho các user chưa bị xóa mềm
CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_phone_active_unique" 
ON "users" ("phone") 
WHERE "phone" IS NOT NULL AND "deletedAt" IS NULL;


-- ==============================================================================
-- 3. GIN TRIGRAM INDEXES (TỐI ƯU TÌM KIẾM CHUỖI & JSONB SIÊU NHANH)
-- ==============================================================================

-- GIN Trigram Index trên PNR & providerBookingId (cho getBookings.ts)
CREATE INDEX IF NOT EXISTS "idx_bookings_pnr_trgm" 
ON "bookings" USING gin (
  (COALESCE("customFields"->'flightSnapshot'->>'bookingReference', "providerBookingId", '')) gin_trgm_ops
);

-- GIN Trigram Index trên tên hành khách ghép (cho searchPassenger.ts)
CREATE INDEX IF NOT EXISTS "idx_passengers_fullname_trgm" 
ON "passengers" USING gin (
  (("firstName" || ' ' || "lastName")) gin_trgm_ops
);


-- ==============================================================================
-- 4. LEAN PARTIAL COMPOSITE INDEXES (DUNG LƯỢNG NHẸ, CHỈ QUÉT BẢN GHI ACTIVE)
-- ==============================================================================

-- Bookings: Lọc theo user + Sort createdAt DESC (Bỏ qua các đơn đã xóa mềm)
CREATE INDEX IF NOT EXISTS "idx_bookings_user_active_created" 
ON "bookings" ("userId", "createdAt" DESC) 
WHERE "deletedAt" IS NULL;

-- Bookings: Lọc theo user + status (Phục vụ các tab PENDING, CONFIRMED,...)
CREATE INDEX IF NOT EXISTS "idx_bookings_user_status_active" 
ON "bookings" ("userId", "status") 
WHERE "deletedAt" IS NULL;

-- Passengers: Lọc theo user + Sort createdAt DESC
CREATE INDEX IF NOT EXISTS "idx_passengers_user_active_created" 
ON "passengers" ("userId", "createdAt" DESC) 
WHERE "deletedAt" IS NULL;

-- Passengers: Tra cứu nhanh theo Passport Number
CREATE INDEX IF NOT EXISTS "idx_passengers_passport_active" 
ON "passengers" ("passportNumber") 
WHERE "passportNumber" IS NOT NULL AND "deletedAt" IS NULL;

-- Transactions: Lọc theo user + Sort createdAt DESC
CREATE INDEX IF NOT EXISTS "idx_transactions_user_active_created" 
ON "transactions" ("userId", "createdAt" DESC) 
WHERE "deletedAt" IS NULL;

-- Transactions: Tra cứu transaction theo bookingId và status
CREATE INDEX IF NOT EXISTS "idx_transactions_booking_status_active" 
ON "transactions" ("bookingId", "status") 
WHERE "deletedAt" IS NULL;
