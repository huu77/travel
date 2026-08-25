-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('FLIGHT', 'PAYMENT', 'STAYS', 'CAR');

-- CreateTable
CREATE TABLE "providers" (
    "providerId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProviderType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "providers_pkey" PRIMARY KEY ("providerId")
);

-- CreateIndex
CREATE UNIQUE INDEX "providers_code_key" ON "providers"("code");

-- Insert Default Providers
INSERT INTO "providers" ("providerId", "code", "name", "type", "description", "updatedAt") VALUES
  ('00000000-0000-4000-9000-000000000001', 'duffel', 'Duffel Flights API', 'FLIGHT', 'Global flight search, hold orders and ticketing', NOW()),
  ('00000000-0000-4000-9000-000000000002', 'stripe', 'Stripe Payments', 'PAYMENT', 'Global card payments and refunds', NOW()),
  ('00000000-0000-4000-9000-000000000003', 'amadeus', 'Amadeus GDS', 'FLIGHT', 'Global Distribution System', NOW()),
  ('00000000-0000-4000-9000-000000000004', 'vnpay', 'VNPay Gateway', 'PAYMENT', 'Vietnam domestic QR and banking payment', NOW())
ON CONFLICT ("code") DO NOTHING;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_provider_fkey" FOREIGN KEY ("provider") REFERENCES "providers"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_provider_fkey" FOREIGN KEY ("provider") REFERENCES "providers"("code") ON DELETE SET NULL ON UPDATE CASCADE;
