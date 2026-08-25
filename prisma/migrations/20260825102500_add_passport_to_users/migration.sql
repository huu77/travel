-- AlterTable
ALTER TABLE "users"
  ADD COLUMN "passportNumber" TEXT,
  ADD COLUMN "passportCountry" TEXT,
  ADD COLUMN "passportExpiryDate" TIMESTAMP(3);
