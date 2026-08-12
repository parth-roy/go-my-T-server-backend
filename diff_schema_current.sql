-- CreateEnum
CREATE TYPE "DriverWalletReason" AS ENUM ('TRIP_EARNING', 'COMMISSION_DEDUCTED', 'COMMISSION_PAID', 'CASHBACK', 'WITHDRAWAL', 'ADMIN_CREDIT', 'ADMIN_DEBIT', 'FLEET_SALARY', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "WorkerWalletReason" AS ENUM ('JOB_EARNING', 'COMMISSION_DEDUCTED', 'COMMISSION_PAID', 'CASHBACK', 'WITHDRAWAL', 'ADMIN_CREDIT', 'ADMIN_DEBIT');

-- CreateEnum
CREATE TYPE "WithdrawalEntityType" AS ENUM ('DRIVER', 'FLEET', 'WORKER');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'AUTO_PROCESSING', 'COMPLETED', 'FAILED', 'ADMIN_PENDING', 'ADMIN_COMPLETED');

-- CreateEnum
CREATE TYPE "DigiKycStatus" AS ENUM ('PENDING', 'OTP_SENT', 'TOKEN_READY', 'VERIFIED', 'FAILED', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "WebContactMessageStatus" AS ENUM ('UNREAD', 'READ', 'RESOLVED');

-- CreateEnum
CREATE TYPE "WorkerStatus" AS ENUM ('OFFLINE', 'AVAILABLE', 'ON_JOB');

-- CreateEnum
CREATE TYPE "WorkerJobStatus" AS ENUM ('PENDING_ACCEPTANCE', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ScratchCardStatus" AS ENUM ('LOCKED', 'READY', 'SCRATCHED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('COINS', 'DISCOUNT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BOOKING_STATUS', 'PAYMENT', 'PROMO', 'SYSTEM');

-- CreateEnum
CREATE TYPE "BadgeTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND');

-- CreateEnum
CREATE TYPE "BadgeMetric" AS ENUM ('TOTAL_JOBS', 'RATING', 'ACCEPTANCE_RATE', 'ON_TIME_RATE', 'TOTAL_EARNINGS');

-- CreateEnum
CREATE TYPE "CourseLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('PENDING', 'CONTACTED', 'CONVERTED', 'REJECTED', 'SUITABLE');

-- CreateEnum
CREATE TYPE "GigJobStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'FLEET_OWNER';
ALTER TYPE "UserRole" ADD VALUE 'WORKER';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "VehicleType" ADD VALUE 'TRUCK_14FT';
ALTER TYPE "VehicleType" ADD VALUE 'TRUCK_17FT';
ALTER TYPE "VehicleType" ADD VALUE 'TRUCK_20FT';
ALTER TYPE "VehicleType" ADD VALUE 'CONTAINER_32FT';
ALTER TYPE "VehicleType" ADD VALUE 'MAHINDRA_JEETO';
ALTER TYPE "VehicleType" ADD VALUE 'ASHOK_LEYLAND_DOST';
ALTER TYPE "VehicleType" ADD VALUE 'BOLERO_PICKUP';
ALTER TYPE "VehicleType" ADD VALUE 'TATA_INTRA';
ALTER TYPE "VehicleType" ADD VALUE 'MINI_OPEN_PICKUP';
ALTER TYPE "VehicleType" ADD VALUE 'MINI_CLOSED_VAN';
ALTER TYPE "VehicleType" ADD VALUE 'LCV_BOX_TRUCK';
ALTER TYPE "VehicleType" ADD VALUE 'TRUCK_14FT_OPEN';
ALTER TYPE "VehicleType" ADD VALUE 'TRUCK_14FT_CLOSED';
ALTER TYPE "VehicleType" ADD VALUE 'TRUCK_17FT_CLOSED';
ALTER TYPE "VehicleType" ADD VALUE 'TRUCK_19FT';

-- AlterEnum
ALTER TYPE "WalletTransactionReason" ADD VALUE 'ADMIN_DEBIT';

-- DropForeignKey
ALTER TABLE "KeyResult" DROP CONSTRAINT "KeyResult_workerObjectiveId_fkey";

-- DropForeignKey
ALTER TABLE "ManagerEvaluation" DROP CONSTRAINT "ManagerEvaluation_workerPerformanceCycleId_fkey";

-- DropForeignKey
ALTER TABLE "WorkerObjective" DROP CONSTRAINT "WorkerObjective_workerPerformanceCycleId_fkey";

-- AlterTable
ALTER TABLE "announcements" ADD COLUMN     "target" TEXT NOT NULL DEFAULT 'CUSTOMER';

-- AlterTable
ALTER TABLE "bid_awards" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "bid_windows" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "booking_stops" ADD COLUMN     "podPhotoUrl" TEXT,
ADD COLUMN     "podVerifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "arrivalTime" TIMESTAMP(3),
ADD COLUMN     "declineCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "etaLastCalculatedAt" TIMESTAMP(3),
ADD COLUMN     "etaLastDriverLat" DOUBLE PRECISION,
ADD COLUMN     "etaLastDriverLng" DOUBLE PRECISION,
ADD COLUMN     "etaMinutes" INTEGER,
ADD COLUMN     "fuelSurcharge" DOUBLE PRECISION,
ADD COLUMN     "grandTotal" DOUBLE PRECISION,
ADD COLUMN     "gstAmount" DOUBLE PRECISION,
ADD COLUMN     "insuranceAmount" DOUBLE PRECISION,
ADD COLUMN     "insuranceOpted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "insuranceProvider" TEXT,
ADD COLUMN     "razorpayOrderId" TEXT,
ADD COLUMN     "timeFare" DOUBLE PRECISION,
ADD COLUMN     "tollCharge" DOUBLE PRECISION,
ADD COLUMN     "waitingCharge" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "bankAccountHolderName" TEXT,
ADD COLUMN     "bankAccountNo" TEXT,
ADD COLUMN     "bankIfsc" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "bankVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "razorpayxContactId" TEXT,
ADD COLUMN     "razorpayxFundAccountId" TEXT;

-- AlterTable
ALTER TABLE "marketplace_bids" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "passwordResetExpiry" TIMESTAMP(3),
ADD COLUMN     "passwordResetToken" TEXT;

-- AlterTable
ALTER TABLE "vehicle_type_pricing" ADD COLUMN     "baseIncludesKm" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
ADD COLUMN     "loadingChargePerHelper" DOUBLE PRECISION NOT NULL DEFAULT 400,
ADD COLUMN     "maxHelpers" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "surgeHardCap" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
ADD COLUMN     "tcoPerKm" DOUBLE PRECISION NOT NULL DEFAULT 15.0,
ADD COLUMN     "timeChargePerMin" DOUBLE PRECISION NOT NULL DEFAULT 1.50,
ADD COLUMN     "timeFreeMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "waitingChargePerBlock" DOUBLE PRECISION NOT NULL DEFAULT 100,
ADD COLUMN     "waitingFreeMinutes" INTEGER NOT NULL DEFAULT 30;

-- DropTable
DROP TABLE "KeyResult";

-- DropTable
DROP TABLE "ManagerEvaluation";

-- DropTable
DROP TABLE "PerformanceScoringPolicy";

-- DropTable
DROP TABLE "WorkerAdherenceReadModel";

-- DropTable
DROP TABLE "WorkerObjective";

-- DropTable
DROP TABLE "WorkerPerformanceCycle";

-- DropTable
DROP TABLE "WorkerPerformanceDashboard";

-- DropTable
DROP TABLE "dummy_worker_cycle";

-- DropTable
DROP TABLE "dummy_worker_cycle_v2";

-- DropTable
DROP TABLE "dummy_worker_cycle_v3";

-- DropTable
DROP TABLE "time_performance_events";

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDocVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "WorkerStatus" NOT NULL DEFAULT 'OFFLINE',
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "totalJobs" INTEGER NOT NULL DEFAULT 0,
    "acceptanceRate" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,
    "lastLocationAt" TIMESTAMP(3),
    "maxWeightKg" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "preferredTypes" "LaborType"[],
    "preferredWork" TEXT,
    "vehicleAccess" BOOLEAN NOT NULL DEFAULT false,
    "availableTime" TEXT,
    "preferredDistance" INTEGER NOT NULL DEFAULT 25,
    "languages" TEXT[] DEFAULT ARRAY['Hindi', 'English']::TEXT[],
    "gamificationPoints" INTEGER NOT NULL DEFAULT 0,
    "gamificationTier" "BadgeTier" NOT NULL DEFAULT 'BRONZE',
    "bankAccountNo" TEXT,
    "bankIfsc" TEXT,
    "bankName" TEXT,
    "bankAccountHolderName" TEXT,
    "razorpayxContactId" TEXT,
    "razorpayxFundAccountId" TEXT,
    "bankVerified" BOOLEAN NOT NULL DEFAULT false,
    "aadhaarNumber" TEXT,
    "aadhaarVerifStatus" "DigiKycStatus" NOT NULL DEFAULT 'PENDING',
    "aadhaarVerifiedAt" TIMESTAMP(3),
    "aadhaarUrl" TEXT,
    "panNumber" TEXT,
    "panVerifStatus" "DigiKycStatus" NOT NULL DEFAULT 'PENDING',
    "panVerifiedAt" TIMESTAMP(3),
    "panUrl" TEXT,
    "digiCodeVerifier" TEXT,
    "digiCodeChallenge" TEXT,
    "digiCode" TEXT,
    "digiAccessToken" TEXT,
    "digiTokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_documents" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "rejectedReason" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "worker_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "tier" "BadgeTier" NOT NULL,
    "metric" "BadgeMetric" NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "pointsReward" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerBadge" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isEarned" BOOLEAN NOT NULL DEFAULT false,
    "earnedAt" TIMESTAMP(3),

    CONSTRAINT "WorkerBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_assignments" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "status" "WorkerJobStatus" NOT NULL DEFAULT 'PENDING_ACCEPTANCE',
    "payoutAmount" DOUBLE PRECISION NOT NULL,
    "completionOtp" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bids" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scratch_cards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT,
    "status" "ScratchCardStatus" NOT NULL DEFAULT 'LOCKED',
    "isWin" BOOLEAN NOT NULL DEFAULT false,
    "rewardType" "RewardType",
    "rewardValue" DOUBLE PRECISION,
    "title" TEXT,
    "description" TEXT,
    "unlockedAt" TIMESTAMP(3),
    "scratchedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scratch_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "web_contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "WebContactMessageStatus" NOT NULL DEFAULT 'UNREAD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "web_contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "pricing_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_audit_log" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "vehicleType" "VehicleType" NOT NULL,
    "pickupLat" DOUBLE PRECISION NOT NULL,
    "pickupLng" DOUBLE PRECISION NOT NULL,
    "dropLat" DOUBLE PRECISION NOT NULL,
    "dropLng" DOUBLE PRECISION NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "baseFare" DOUBLE PRECISION NOT NULL,
    "distanceFare" DOUBLE PRECISION NOT NULL,
    "timeFare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fuelSurcharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "surgeMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "loadingCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "insuranceCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "totalFare" DOUBLE PRECISION NOT NULL,
    "freightGst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "loadingGst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "insuranceGst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grandTotal" DOUBLE PRECISION NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "commissionAmount" DOUBLE PRECISION NOT NULL,
    "driverPayout" DOUBLE PRECISION NOT NULL,
    "subsidyAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL,
    "distanceSource" TEXT NOT NULL DEFAULT 'mapbox',
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pricing_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_payout_subsidy" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "vehicleType" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "originalCommission" DOUBLE PRECISION NOT NULL,
    "effectiveCommission" DOUBLE PRECISION NOT NULL,
    "subsidyAmount" DOUBLE PRECISION NOT NULL,
    "totalFare" DOUBLE PRECISION NOT NULL,
    "driverPayout" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_payout_subsidy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "serviceability_config" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isAllowed" BOOLEAN NOT NULL DEFAULT true,
    "vehicleTypes" TEXT,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "serviceability_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "referenceId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_owners" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "bankAccountNo" TEXT,
    "bankIfsc" TEXT,
    "bankName" TEXT,
    "bankAccountHolderName" TEXT,
    "razorpayxContactId" TEXT,
    "razorpayxFundAccountId" TEXT,
    "bankVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_trucks" (
    "id" TEXT NOT NULL,
    "fleetOwnerId" TEXT NOT NULL,
    "registrationNo" TEXT NOT NULL,
    "type" "VehicleType" NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "color" TEXT,
    "capacityKg" DOUBLE PRECISION NOT NULL,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,
    "lastLocationAt" TIMESTAMP(3),
    "currentDriverId" TEXT,
    "rcDocUrl" TEXT,
    "insuranceDocUrl" TEXT,
    "fitnessDocUrl" TEXT,
    "pucDocUrl" TEXT,
    "permitDocUrl" TEXT,
    "insuranceExpiry" TIMESTAMP(3),
    "fitnessExpiry" TIMESTAMP(3),
    "pucExpiry" TIMESTAMP(3),
    "permitExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_trucks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_drivers" (
    "id" TEXT NOT NULL,
    "fleetOwnerId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fleet_drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "truck_assignments" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fleetOwnerId" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "fleetDriverId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "truck_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_truck_usage" (
    "id" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,

    CONSTRAINT "fleet_truck_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_wallets" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "cachedBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_wallet_transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "reason" "DriverWalletReason" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "bookingId" TEXT,
    "referenceId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_wallets" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "cachedBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worker_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_wallet_transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "reason" "WorkerWalletReason" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "bookingId" TEXT,
    "referenceId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "worker_wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_requests" (
    "id" TEXT NOT NULL,
    "entityType" "WithdrawalEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "bankAccountNo" TEXT NOT NULL,
    "bankIfsc" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankAccountHolderName" TEXT NOT NULL,
    "razorpayxContactId" TEXT,
    "razorpayxFundAccountId" TEXT,
    "razorpayxPayoutId" TEXT,
    "razorpayxUtr" TEXT,
    "adminNote" TEXT,
    "processedBy" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,

    CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_webhooks" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_collection_records" (
    "id" TEXT NOT NULL,
    "entityType" "WithdrawalEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "bookingId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "collectedBy" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_collection_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_wallets" (
    "id" TEXT NOT NULL,
    "fleetOwnerId" TEXT NOT NULL,
    "cachedBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_wallet_transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "referenceId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fleet_wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_earnings" (
    "id" TEXT NOT NULL,
    "fleetOwnerId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "grossAmount" DOUBLE PRECISION NOT NULL,
    "driverPayout" DOUBLE PRECISION NOT NULL,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fleet_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_maintenance" (
    "id" TEXT NOT NULL,
    "fleetOwnerId" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "description" TEXT,
    "costRupees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "servicedAt" TIMESTAMP(3) NOT NULL,
    "nextDueDate" TIMESTAMP(3),
    "workshop" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fleet_maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_fuel_logs" (
    "id" TEXT NOT NULL,
    "fleetOwnerId" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "litresFilled" DOUBLE PRECISION NOT NULL,
    "pricePerLitre" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "odometerKm" DOUBLE PRECISION,
    "filledAt" TIMESTAMP(3) NOT NULL,
    "fuelStation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fleet_fuel_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_truck_documents" (
    "id" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "fleet_truck_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_courses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "modulesCount" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "level" "CourseLevel" NOT NULL,
    "icon" TEXT NOT NULL,
    "iconColor" TEXT NOT NULL,
    "iconBgColor" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_training_progress" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "status" "CourseStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "completedModules" INTEGER NOT NULL DEFAULT 0,
    "lastAccessed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "certificateUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worker_training_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gig_jobs" (
    "id" TEXT NOT NULL,
    "jobNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "gigType" TEXT NOT NULL,
    "gigCategory" TEXT NOT NULL DEFAULT 'HELPER',
    "description" TEXT,
    "locationLat" DOUBLE PRECISION NOT NULL,
    "locationLng" DOUBLE PRECISION NOT NULL,
    "locationAddress" TEXT NOT NULL,
    "locationZone" TEXT NOT NULL DEFAULT 'RURAL',
    "durationHours" INTEGER NOT NULL DEFAULT 2,
    "urgency" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "status" "GigJobStatus" NOT NULL DEFAULT 'PENDING',
    "workersNeeded" INTEGER NOT NULL DEFAULT 1,
    "totalFare" DOUBLE PRECISION NOT NULL,
    "perWorkerRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "platformFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fareBreakdown" JSONB,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod",
    "razorpayOrderId" TEXT,
    "completionOtp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gig_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GigAssignment" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "status" "WorkerJobStatus" NOT NULL DEFAULT 'PENDING_ACCEPTANCE',
    "payoutAmount" DOUBLE PRECISION NOT NULL,
    "arrivedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GigAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gig_pricing_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "gig_pricing_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workers_userId_key" ON "workers"("userId");

-- CreateIndex
CREATE INDEX "workers_status_idx" ON "workers"("status");

-- CreateIndex
CREATE INDEX "workers_status_isDocVerified_isActive_idx" ON "workers"("status", "isDocVerified", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_code_key" ON "Badge"("code");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerBadge_workerId_badgeId_key" ON "WorkerBadge"("workerId", "badgeId");

-- CreateIndex
CREATE INDEX "job_assignments_bookingId_idx" ON "job_assignments"("bookingId");

-- CreateIndex
CREATE INDEX "job_assignments_workerId_status_idx" ON "job_assignments"("workerId", "status");

-- CreateIndex
CREATE INDEX "job_assignments_status_idx" ON "job_assignments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "job_assignments_bookingId_workerId_key" ON "job_assignments"("bookingId", "workerId");

-- CreateIndex
CREATE UNIQUE INDEX "scratch_cards_bookingId_key" ON "scratch_cards"("bookingId");

-- CreateIndex
CREATE INDEX "scratch_cards_userId_status_idx" ON "scratch_cards"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_config_key_key" ON "pricing_config"("key");

-- CreateIndex
CREATE INDEX "pricing_audit_log_bookingId_idx" ON "pricing_audit_log"("bookingId");

-- CreateIndex
CREATE INDEX "pricing_audit_log_vehicleType_calculatedAt_idx" ON "pricing_audit_log"("vehicleType", "calculatedAt");

-- CreateIndex
CREATE INDEX "pricing_audit_log_calculatedAt_idx" ON "pricing_audit_log"("calculatedAt");

-- CreateIndex
CREATE INDEX "driver_payout_subsidy_createdAt_idx" ON "driver_payout_subsidy"("createdAt");

-- CreateIndex
CREATE INDEX "serviceability_config_level_isAllowed_isActive_idx" ON "serviceability_config"("level", "isAllowed", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "serviceability_config_level_value_key" ON "serviceability_config"("level", "value");

-- CreateIndex
CREATE INDEX "user_notifications_userId_createdAt_idx" ON "user_notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "user_notifications_userId_isRead_idx" ON "user_notifications"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_owners_userId_key" ON "fleet_owners"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_trucks_registrationNo_key" ON "fleet_trucks"("registrationNo");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_drivers_fleetOwnerId_driverId_key" ON "fleet_drivers"("fleetOwnerId", "driverId");

-- CreateIndex
CREATE UNIQUE INDEX "truck_assignments_bookingId_key" ON "truck_assignments"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_truck_usage_assignmentId_key" ON "fleet_truck_usage"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_wallets_driverId_key" ON "driver_wallets"("driverId");

-- CreateIndex
CREATE INDEX "driver_wallet_transactions_walletId_createdAt_idx" ON "driver_wallet_transactions"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "driver_wallet_transactions_bookingId_idx" ON "driver_wallet_transactions"("bookingId");

-- CreateIndex
CREATE INDEX "driver_wallet_transactions_referenceId_idx" ON "driver_wallet_transactions"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "worker_wallets_workerId_key" ON "worker_wallets"("workerId");

-- CreateIndex
CREATE INDEX "worker_wallet_transactions_walletId_createdAt_idx" ON "worker_wallet_transactions"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "worker_wallet_transactions_bookingId_idx" ON "worker_wallet_transactions"("bookingId");

-- CreateIndex
CREATE INDEX "withdrawal_requests_entityType_entityId_status_idx" ON "withdrawal_requests"("entityType", "entityId", "status");

-- CreateIndex
CREATE INDEX "withdrawal_requests_status_requestedAt_idx" ON "withdrawal_requests"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "withdrawal_requests_razorpayxPayoutId_idx" ON "withdrawal_requests"("razorpayxPayoutId");

-- CreateIndex
CREATE UNIQUE INDEX "processed_webhooks_eventId_key" ON "processed_webhooks"("eventId");

-- CreateIndex
CREATE INDEX "processed_webhooks_eventId_idx" ON "processed_webhooks"("eventId");

-- CreateIndex
CREATE INDEX "cash_collection_records_entityType_entityId_idx" ON "cash_collection_records"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "cash_collection_records_createdAt_idx" ON "cash_collection_records"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_wallets_fleetOwnerId_key" ON "fleet_wallets"("fleetOwnerId");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_earnings_bookingId_key" ON "fleet_earnings"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "worker_training_progress_workerId_courseId_key" ON "worker_training_progress"("workerId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "gig_jobs_jobNumber_key" ON "gig_jobs"("jobNumber");

-- CreateIndex
CREATE INDEX "gig_jobs_status_idx" ON "gig_jobs"("status");

-- CreateIndex
CREATE INDEX "gig_jobs_locationZone_status_idx" ON "gig_jobs"("locationZone", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GigAssignment_gigId_workerId_key" ON "GigAssignment"("gigId", "workerId");

-- CreateIndex
CREATE UNIQUE INDEX "gig_pricing_config_key_key" ON "gig_pricing_config"("key");

-- CreateIndex
CREATE INDEX "booking_location_history_bookingId_recordedAt_idx" ON "booking_location_history"("bookingId", "recordedAt");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_customerId_status_idx" ON "bookings"("customerId", "status");

-- CreateIndex
CREATE INDEX "bookings_driverId_status_idx" ON "bookings"("driverId", "status");

-- CreateIndex
CREATE INDEX "bookings_paymentStatus_idx" ON "bookings"("paymentStatus");

-- CreateIndex
CREATE INDEX "bookings_createdAt_idx" ON "bookings"("createdAt");

-- CreateIndex
CREATE INDEX "drivers_status_idx" ON "drivers"("status");

-- CreateIndex
CREATE INDEX "drivers_status_isDocVerified_isActive_idx" ON "drivers"("status", "isDocVerified", "isActive");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_passwordResetToken_key" ON "users"("passwordResetToken");

-- CreateIndex
CREATE INDEX "wallet_transactions_walletId_createdAt_idx" ON "wallet_transactions"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "wallet_transactions_referenceId_idx" ON "wallet_transactions"("referenceId");

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workers" ADD CONSTRAINT "workers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_documents" ADD CONSTRAINT "worker_documents_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerBadge" ADD CONSTRAINT "WorkerBadge_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerBadge" ADD CONSTRAINT "WorkerBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_awardedFleetOwnerId_fkey" FOREIGN KEY ("awardedFleetOwnerId") REFERENCES "fleet_owners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_bids" ADD CONSTRAINT "marketplace_bids_fleetOwnerId_fkey" FOREIGN KEY ("fleetOwnerId") REFERENCES "fleet_owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scratch_cards" ADD CONSTRAINT "scratch_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scratch_cards" ADD CONSTRAINT "scratch_cards_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_owners" ADD CONSTRAINT "fleet_owners_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_trucks" ADD CONSTRAINT "fleet_trucks_fleetOwnerId_fkey" FOREIGN KEY ("fleetOwnerId") REFERENCES "fleet_owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_trucks" ADD CONSTRAINT "fleet_trucks_currentDriverId_fkey" FOREIGN KEY ("currentDriverId") REFERENCES "fleet_drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_drivers" ADD CONSTRAINT "fleet_drivers_fleetOwnerId_fkey" FOREIGN KEY ("fleetOwnerId") REFERENCES "fleet_owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_drivers" ADD CONSTRAINT "fleet_drivers_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_assignments" ADD CONSTRAINT "truck_assignments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_assignments" ADD CONSTRAINT "truck_assignments_fleetOwnerId_fkey" FOREIGN KEY ("fleetOwnerId") REFERENCES "fleet_owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_assignments" ADD CONSTRAINT "truck_assignments_fleetDriverId_fkey" FOREIGN KEY ("fleetDriverId") REFERENCES "fleet_drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_truck_usage" ADD CONSTRAINT "fleet_truck_usage_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "fleet_trucks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_truck_usage" ADD CONSTRAINT "fleet_truck_usage_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "truck_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_wallets" ADD CONSTRAINT "driver_wallets_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_wallet_transactions" ADD CONSTRAINT "driver_wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "driver_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_wallets" ADD CONSTRAINT "worker_wallets_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_wallet_transactions" ADD CONSTRAINT "worker_wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "worker_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_wallets" ADD CONSTRAINT "fleet_wallets_fleetOwnerId_fkey" FOREIGN KEY ("fleetOwnerId") REFERENCES "fleet_owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_wallet_transactions" ADD CONSTRAINT "fleet_wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "fleet_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_earnings" ADD CONSTRAINT "fleet_earnings_fleetOwnerId_fkey" FOREIGN KEY ("fleetOwnerId") REFERENCES "fleet_owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_earnings" ADD CONSTRAINT "fleet_earnings_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_maintenance" ADD CONSTRAINT "fleet_maintenance_fleetOwnerId_fkey" FOREIGN KEY ("fleetOwnerId") REFERENCES "fleet_owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_maintenance" ADD CONSTRAINT "fleet_maintenance_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "fleet_trucks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_fuel_logs" ADD CONSTRAINT "fleet_fuel_logs_fleetOwnerId_fkey" FOREIGN KEY ("fleetOwnerId") REFERENCES "fleet_owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_fuel_logs" ADD CONSTRAINT "fleet_fuel_logs_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "fleet_trucks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_truck_documents" ADD CONSTRAINT "fleet_truck_documents_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "fleet_trucks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_training_progress" ADD CONSTRAINT "worker_training_progress_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_training_progress" ADD CONSTRAINT "worker_training_progress_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "training_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gig_jobs" ADD CONSTRAINT "gig_jobs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GigAssignment" ADD CONSTRAINT "GigAssignment_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "gig_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GigAssignment" ADD CONSTRAINT "GigAssignment_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

