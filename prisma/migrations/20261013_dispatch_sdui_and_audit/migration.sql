-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "BookingChannel" AS ENUM ('CUSTOMER_DIRECT', 'CUSTOMER_AUCTION', 'BROKER_DEMAND', 'BROKER_ATTACHED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "DriverActionType" AS ENUM ('DETAILS_VIEWED', 'CONTACT_UNMASKED', 'PHONE_CALL_INITIATED', 'WHATSAPP_CLICKED', 'BID_SUBMITTED', 'INSTANT_ACCEPTED', 'LOAD_DECLINED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "DispatchAlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL_TIMEOUT', 'SUSPECTED_DISINTERMEDIATION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable bookings
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "bookingChannel" "BookingChannel" NOT NULL DEFAULT 'CUSTOMER_DIRECT';
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "hasCounterBids" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "dispatchedAt" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "dispatchTimeoutAt" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "isOpsEscalated" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bookings_bookingChannel_status_idx" ON "bookings"("bookingChannel", "status");
CREATE INDEX IF NOT EXISTS "bookings_dispatchTimeoutAt_status_idx" ON "bookings"("dispatchTimeoutAt", "status");

-- CreateTable broker_fulfillment_details
CREATE TABLE IF NOT EXISTS "broker_fulfillment_details" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "brokerProfileId" TEXT NOT NULL,
    "assignedDriverName" TEXT NOT NULL,
    "assignedDriverPhone" TEXT NOT NULL,
    "assignedTruckRegNo" TEXT NOT NULL,
    "brokerMarginAmount" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "broker_fulfillment_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "broker_fulfillment_details_bookingId_key" ON "broker_fulfillment_details"("bookingId");
CREATE INDEX IF NOT EXISTS "broker_fulfillment_details_brokerProfileId_idx" ON "broker_fulfillment_details"("brokerProfileId");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "broker_fulfillment_details" ADD CONSTRAINT "broker_fulfillment_details_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "broker_fulfillment_details" ADD CONSTRAINT "broker_fulfillment_details_brokerProfileId_fkey" FOREIGN KEY ("brokerProfileId") REFERENCES "broker_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable driver_engagement_audits
CREATE TABLE IF NOT EXISTS "driver_engagement_audits" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "action" "DriverActionType" NOT NULL,
    "driverLat" DOUBLE PRECISION,
    "driverLng" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_engagement_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "driver_engagement_audits_bookingId_driverId_idx" ON "driver_engagement_audits"("bookingId", "driverId");
CREATE INDEX IF NOT EXISTS "driver_engagement_audits_createdAt_idx" ON "driver_engagement_audits"("createdAt");
CREATE INDEX IF NOT EXISTS "driver_engagement_audits_action_idx" ON "driver_engagement_audits"("action");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "driver_engagement_audits" ADD CONSTRAINT "driver_engagement_audits_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "driver_engagement_audits" ADD CONSTRAINT "driver_engagement_audits_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable admin_dispatch_alerts
CREATE TABLE IF NOT EXISTS "admin_dispatch_alerts" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "severity" "DispatchAlertSeverity" NOT NULL DEFAULT 'WARNING',
    "reason" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedByAdminId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_dispatch_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "admin_dispatch_alerts_isResolved_severity_idx" ON "admin_dispatch_alerts"("isResolved", "severity");
CREATE INDEX IF NOT EXISTS "admin_dispatch_alerts_createdAt_idx" ON "admin_dispatch_alerts"("createdAt");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "admin_dispatch_alerts" ADD CONSTRAINT "admin_dispatch_alerts_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
