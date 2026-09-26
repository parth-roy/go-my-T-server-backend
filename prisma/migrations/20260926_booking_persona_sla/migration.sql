-- Migration: 20260926_booking_persona_sla
-- Add BookingPersona and UrgencyWindow enums + new fields to Booking and BrokerLoad
-- Safe: all new columns have defaults; zero existing rows affected.

-- Step 1: Create the two new enums
DO $$ BEGIN
  CREATE TYPE "BookingPersona" AS ENUM ('INDIVIDUAL', 'ENTERPRISE', 'CONTRACTUAL');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "UrgencyWindow" AS ENUM ('UNDER_2_HOURS', 'UNDER_4_HOURS', 'UNDER_24_HOURS', 'TWO_DAYS', 'FLEXIBLE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add columns to bookings table
ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "bookingPersona" "BookingPersona" NOT NULL DEFAULT 'INDIVIDUAL',
  ADD COLUMN IF NOT EXISTS "truckCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "contractDuration" TEXT,
  ADD COLUMN IF NOT EXISTS "urgencyWindow" "UrgencyWindow" NOT NULL DEFAULT 'FLEXIBLE',
  ADD COLUMN IF NOT EXISTS "slaExpiresAt" TIMESTAMP(3);

-- Step 3: Add columns to broker_loads table
ALTER TABLE "broker_loads"
  ADD COLUMN IF NOT EXISTS "bookingPersona" "BookingPersona" NOT NULL DEFAULT 'INDIVIDUAL',
  ADD COLUMN IF NOT EXISTS "truckCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "urgencyWindow" "UrgencyWindow" NOT NULL DEFAULT 'FLEXIBLE',
  ADD COLUMN IF NOT EXISTS "slaExpiresAt" TIMESTAMP(3);

-- Step 4: Add indexes
CREATE INDEX IF NOT EXISTS "bookings_slaExpiresAt_idx" ON "bookings"("slaExpiresAt");
CREATE INDEX IF NOT EXISTS "broker_loads_slaExpiresAt_brokerStatus_idx" ON "broker_loads"("slaExpiresAt", "brokerStatus");
