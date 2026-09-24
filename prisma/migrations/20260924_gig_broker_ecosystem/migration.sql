-- Add new enum values to existing enums
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MIDDLEMAN';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'B2B_OWNER';
ALTER TYPE "DriverWalletReason" ADD VALUE IF NOT EXISTS 'BROKER_BOUNTY';

-- Create new Enums
DO $$
BEGIN
  CREATE TYPE "BrokerQuoteStatus" AS ENUM ('PENDING', 'OPS_REVIEW', 'ACCEPTED', 'REJECTED', 'DRIVER_DROPOUT', 'COUNTER_OFFERED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "BrokerBookingStatus" AS ENUM ('SOURCING', 'PENDING_REVIEW', 'ADVANCE_PENDING', 'BOOKING_LOCKED', 'LOADING_CONFIRMED', 'TRIP_COMPLETED', 'RE_SOURCING', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "BountySettlementStatus" AS ENUM ('PENDING', 'ELIGIBLE', 'MANUALLY_SETTLED', 'VOIDED', 'PARTIAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create broker_profiles table
CREATE TABLE "broker_profiles" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "isKycVerified" BOOLEAN NOT NULL DEFAULT false,
  "kycVerifiedAt" TIMESTAMP(3),
  "aadhaarLast4" TEXT,
  "panNumber" TEXT,
  "primaryCity" TEXT,
  "primaryState" TEXT,
  "operatingCities" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "totalQuotesSubmitted" INTEGER NOT NULL DEFAULT 0,
  "totalLoadsFulfilled" INTEGER NOT NULL DEFAULT 0,
  "totalBountiesEarned" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "driversOnboarded" INTEGER NOT NULL DEFAULT 0,
  "microCommissionBonus" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "referredByBrokerId" TEXT,
  "referralCode" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "broker_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "broker_profiles_userId_key" ON "broker_profiles"("userId");
CREATE UNIQUE INDEX "broker_profiles_referralCode_key" ON "broker_profiles"("referralCode");
CREATE INDEX "broker_profiles_primaryCity_isActive_idx" ON "broker_profiles"("primaryCity", "isActive");
CREATE INDEX "broker_profiles_isKycVerified_isActive_idx" ON "broker_profiles"("isKycVerified", "isActive");

-- Create broker_loads table
CREATE TABLE "broker_loads" (
  "id" TEXT NOT NULL,
  "sourceBookingId" TEXT,
  "pickupCity" TEXT NOT NULL,
  "pickupAddress" TEXT NOT NULL,
  "dropCity" TEXT NOT NULL,
  "dropAddress" TEXT NOT NULL,
  "vehicleType" "VehicleType" NOT NULL,
  "goodsType" TEXT NOT NULL DEFAULT 'General Goods',
  "goodsWeightKg" DOUBLE PRECISION,
  "estimatedDistanceKm" DOUBLE PRECISION,
  "customerBudget" DOUBLE PRECISION NOT NULL,
  "platformFinalPrice" DOUBLE PRECISION,
  "targetCities" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "isUrgent" BOOLEAN NOT NULL DEFAULT false,
  "brokerStatus" "BrokerBookingStatus" NOT NULL DEFAULT 'SOURCING',
  "selectedQuoteId" TEXT,
  "advanceAmount" DOUBLE PRECISION,
  "isAdvanceCollected" BOOLEAN NOT NULL DEFAULT false,
  "advanceCollectedAt" TIMESTAMP(3),
  "advancePaymentRef" TEXT,
  "loadingOtp" TEXT,
  "loadingOtpExpiry" TIMESTAMP(3),
  "isLoadingConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "loadingConfirmedAt" TIMESTAMP(3),
  "loadingConfirmedByDriverId" TEXT,
  "isTripCompleted" BOOLEAN NOT NULL DEFAULT false,
  "tripCompletedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "cancellationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "broker_loads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "broker_loads_sourceBookingId_key" ON "broker_loads"("sourceBookingId");
CREATE UNIQUE INDEX "broker_loads_selectedQuoteId_key" ON "broker_loads"("selectedQuoteId");
CREATE INDEX "broker_loads_brokerStatus_idx" ON "broker_loads"("brokerStatus");
CREATE INDEX "broker_loads_pickupCity_brokerStatus_idx" ON "broker_loads"("pickupCity", "brokerStatus");
CREATE INDEX "broker_loads_isUrgent_brokerStatus_idx" ON "broker_loads"("isUrgent", "brokerStatus");
CREATE INDEX "broker_loads_createdAt_idx" ON "broker_loads"("createdAt");

-- Create broker_quotes table
CREATE TABLE "broker_quotes" (
  "id" TEXT NOT NULL,
  "loadId" TEXT NOT NULL,
  "brokerId" TEXT NOT NULL,
  "driverPhone" TEXT NOT NULL,
  "driverName" TEXT,
  "vehicleRegNo" TEXT NOT NULL,
  "vehicleRcPhotoUrl" TEXT NOT NULL,
  "vehiclePhotoUrl" TEXT,
  "negotiatedAmount" DOUBLE PRECISION NOT NULL,
  "counterAmount" DOUBLE PRECISION,
  "isCounterAccepted" BOOLEAN NOT NULL DEFAULT false,
  "isRcBlacklisted" BOOLEAN NOT NULL DEFAULT false,
  "isDriverVerified" BOOLEAN NOT NULL DEFAULT false,
  "opsVerifiedAt" TIMESTAMP(3),
  "opsVerifiedBy" TEXT,
  "status" "BrokerQuoteStatus" NOT NULL DEFAULT 'PENDING',
  "rejectedReason" TEXT,
  "flatFeeBounty" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "broker_quotes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "broker_quotes_loadId_brokerId_key" ON "broker_quotes"("loadId", "brokerId");
CREATE INDEX "broker_quotes_loadId_status_idx" ON "broker_quotes"("loadId", "status");
CREATE INDEX "broker_quotes_brokerId_status_idx" ON "broker_quotes"("brokerId", "status");
CREATE INDEX "broker_quotes_vehicleRegNo_idx" ON "broker_quotes"("vehicleRegNo");

-- Create broker_load_audit_logs table
CREATE TABLE "broker_load_audit_logs" (
  "id" TEXT NOT NULL,
  "loadId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorRole" "UserRole" NOT NULL,
  "action" TEXT NOT NULL,
  "previousStatus" "BrokerBookingStatus",
  "newStatus" "BrokerBookingStatus",
  "metadata" JSONB,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "broker_load_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "broker_load_audit_logs_loadId_timestamp_idx" ON "broker_load_audit_logs"("loadId", "timestamp");
CREATE INDEX "broker_load_audit_logs_actorId_idx" ON "broker_load_audit_logs"("actorId");

-- Create broker_bounty_ledger table
CREATE TABLE "broker_bounty_ledger" (
  "id" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "brokerId" TEXT NOT NULL,
  "bountyAmount" DOUBLE PRECISION NOT NULL,
  "settlementStatus" "BountySettlementStatus" NOT NULL DEFAULT 'PENDING',
  "eligibleAt" TIMESTAMP(3),
  "settledAt" TIMESTAMP(3),
  "settledBy" TEXT,
  "settlementRef" TEXT,
  "voidedAt" TIMESTAMP(3),
  "voidReason" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "broker_bounty_ledger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "broker_bounty_ledger_quoteId_key" ON "broker_bounty_ledger"("quoteId");
CREATE INDEX "broker_bounty_ledger_settlementStatus_idx" ON "broker_bounty_ledger"("settlementStatus");
CREATE INDEX "broker_bounty_ledger_brokerId_settlementStatus_idx" ON "broker_bounty_ledger"("brokerId", "settlementStatus");

-- Create broker_driver_retentions table
CREATE TABLE "broker_driver_retentions" (
  "id" TEXT NOT NULL,
  "brokerId" TEXT NOT NULL,
  "driverPhone" TEXT NOT NULL,
  "driverId" TEXT,
  "appInstallConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "appInstalledAt" TIMESTAMP(3),
  "independentTripsCompleted" INTEGER NOT NULL DEFAULT 0,
  "microCommissionEarned" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "bonusCreditedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "broker_driver_retentions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "broker_driver_retentions_brokerId_driverPhone_key" ON "broker_driver_retentions"("brokerId", "driverPhone");
CREATE INDEX "broker_driver_retentions_driverId_idx" ON "broker_driver_retentions"("driverId");

-- Add Foreign Keys
ALTER TABLE "broker_profiles" ADD CONSTRAINT "broker_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "broker_quotes" ADD CONSTRAINT "broker_quotes_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "broker_loads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "broker_quotes" ADD CONSTRAINT "broker_quotes_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "broker_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "broker_load_audit_logs" ADD CONSTRAINT "broker_load_audit_logs_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "broker_loads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "broker_bounty_ledger" ADD CONSTRAINT "broker_bounty_ledger_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "broker_quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "broker_driver_retentions" ADD CONSTRAINT "broker_driver_retentions_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "broker_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
