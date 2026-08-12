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

-- CreateEnum
CREATE TYPE "OrgVerifStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('PRIMARY_OWNER', 'ORG_ADMIN', 'HR', 'SUPERVISOR', 'EMPLOYEE', 'VIEWER');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('COMPANY', 'CONTRACTOR', 'VENDOR', 'OTHER');

-- CreateEnum
CREATE TYPE "BranchStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DepartmentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DesignationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EmploymentCategory" AS ENUM ('GIG_INDEPENDENT', 'FLEET_MANAGED_CONTRACTOR', 'THIRD_PARTY_AGENCY', 'FULL_TIME_EMPLOYEE', 'PART_TIME_EMPLOYEE');

-- CreateEnum
CREATE TYPE "EmploymentAssignmentStatus" AS ENUM ('ACTIVE', 'SCHEDULED', 'COMPLETED', 'TERMINATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmploymentTransitionReason" AS ENUM ('NEW_HIRE', 'PROMOTION', 'TRANSFER', 'EMPLOYMENT_TYPE_CHANGE', 'DESIGNATION_CHANGE', 'TEAM_CHANGE', 'DEPARTMENT_CHANGE', 'BRANCH_CHANGE', 'RETURN_FROM_LEAVE', 'MARKETPLACE_CONVERSION', 'REHIRE', 'TERMINATION');

-- CreateEnum
CREATE TYPE "ScheduleTargetType" AS ENUM ('ORGANIZATION', 'BRANCH', 'DEPARTMENT', 'TEAM', 'ASSIGNMENT');

-- CreateEnum
CREATE TYPE "TemplateVersionStatus" AS ENUM ('DRAFT', 'VALIDATED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ScheduleAssignmentReason" AS ENUM ('DEFAULT', 'TRANSFER', 'TEMP_OVERRIDE', 'PROJECT', 'SEASONAL', 'EMERGENCY', 'MANUAL');

-- CreateEnum
CREATE TYPE "ShiftLifecycleStatus" AS ENUM ('DRAFT', 'GENERATED', 'PUBLISHED', 'ACKNOWLEDGED', 'CHECKIN_OPEN', 'IN_PROGRESS', 'CHECKOUT_PENDING', 'COMPLETED', 'MISSED', 'EXPIRED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ShiftGenerationTrigger" AS ENUM ('MANUAL', 'CRON', 'SCHEDULE_CHANGED', 'ASSIGNMENT_CHANGED', 'RETRY');

-- CreateEnum
CREATE TYPE "ShiftGenerationJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ShiftOverrideStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ShiftTimelineEventType" AS ENUM ('GENERATED', 'PUBLISHED', 'VIEWED', 'ACCEPTED', 'OVERRIDE_APPLIED', 'CHECKIN', 'BREAK_START', 'BREAK_END', 'CHECKOUT', 'APPROVED', 'PAYROLL_LOCKED');

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

-- DropIndex
DROP INDEX "PerformanceScoringPolicy_policyId_version_key";

-- DropIndex
DROP INDEX "WorkerPerformanceCycle_workerId_cycleId_key";

-- DropIndex
DROP INDEX "WorkerPerformanceDashboard_workerId_cycleId_key";

-- DropIndex
DROP INDEX "time_performance_events_aggregateId_aggregateVersion_key";

-- AlterTable
ALTER TABLE "PerformanceScoringPolicy" ADD COLUMN     "organizationId" UUID;

-- AlterTable
ALTER TABLE "WorkerPerformanceCycle" ADD COLUMN     "membershipId" UUID;

-- AlterTable
ALTER TABLE "WorkerPerformanceDashboard" ADD COLUMN     "membershipId" UUID,
ADD COLUMN     "organizationId" UUID;

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

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "gstin" TEXT,
    "panNumber" TEXT,
    "organizationType" "OrganizationType" NOT NULL DEFAULT 'COMPANY',
    "status" "OrganizationStatus" NOT NULL DEFAULT 'PENDING',
    "verificationStatus" "OrgVerifStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_memberships" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL DEFAULT 'VIEWER',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_membership_invitations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "role" "OrganizationRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "capabilitySnapshot" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "inviterId" TEXT NOT NULL,

    CONSTRAINT "organization_membership_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_driver_leads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "alternatePhone" TEXT,
    "city" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "aadharNumber" TEXT NOT NULL,
    "dlNumber" TEXT NOT NULL,
    "profilePhotoUrl" TEXT,
    "aadharFrontUrl" TEXT,
    "aadharBackUrl" TEXT,
    "dlFrontUrl" TEXT,
    "dlBackUrl" TEXT,
    "rcBookUrl" TEXT,
    "insuranceUrl" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_driver_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_branches" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "postalCode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" TEXT,
    "email" TEXT,
    "managerId" TEXT,
    "status" "BranchStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "organization_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_departments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "managerId" TEXT,
    "status" "DepartmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "organization_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_designations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER,
    "status" "DesignationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "organization_designations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_teams" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "leaderId" TEXT,
    "status" "TeamStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "organization_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_employment_types" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "EmploymentCategory" NOT NULL,
    "rulesConfig" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "organization_employment_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_employment_assignments" (
    "id" TEXT NOT NULL,
    "assignmentNumber" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "employmentTypeId" TEXT NOT NULL,
    "employmentTypeNameSnapshot" TEXT NOT NULL,
    "designationId" TEXT,
    "designationNameSnapshot" TEXT,
    "branchId" TEXT,
    "branchNameSnapshot" TEXT,
    "departmentId" TEXT,
    "departmentNameSnapshot" TEXT,
    "teamId" TEXT,
    "teamNameSnapshot" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "status" "EmploymentAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "transitionMetadata" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_employment_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_schedule_templates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "work_schedule_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_schedule_template_versions" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "TemplateVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "configurationData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_schedule_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_assignments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "targetType" "ScheduleTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "scheduleTemplateVersionId" TEXT NOT NULL,
    "reason" "ScheduleAssignmentReason" NOT NULL DEFAULT 'DEFAULT',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "status" "EmploymentAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftGenerationJob" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "windowStart" DATE NOT NULL,
    "windowEnd" DATE NOT NULL,
    "status" "ShiftGenerationJobStatus" NOT NULL,
    "generatedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMPTZ,
    "completedAt" TIMESTAMPTZ,
    "trigger" "ShiftGenerationTrigger" NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ShiftGenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftInstance" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "ShiftLifecycleStatus" NOT NULL,
    "startTime" TIMESTAMPTZ NOT NULL,
    "endTime" TIMESTAMPTZ NOT NULL,
    "expectedDuration" INTEGER NOT NULL,
    "scheduleSnapshot" JSONB NOT NULL,
    "assignmentSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ShiftInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftOverride" (
    "id" UUID NOT NULL,
    "shiftId" UUID NOT NULL,
    "status" "ShiftOverrideStatus" NOT NULL,
    "overrideStartTime" TIMESTAMPTZ,
    "overrideEndTime" TIMESTAMPTZ,
    "reason" TEXT NOT NULL,
    "requestedBy" UUID NOT NULL,
    "approvedBy" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ShiftOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftTimelineEvent" (
    "id" UUID NOT NULL,
    "shiftId" UUID NOT NULL,
    "eventType" "ShiftTimelineEventType" NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "ShiftTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerAttendanceEvent" (
    "eventId" UUID NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventVersion" TEXT NOT NULL DEFAULT '1.0',
    "schemaVersion" TEXT NOT NULL DEFAULT '1.0',
    "commandId" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "causationId" TEXT NOT NULL,
    "workerId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "recordedAt" TIMESTAMPTZ NOT NULL,
    "deviceTime" TIMESTAMPTZ NOT NULL,
    "serverTime" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "workContext" JSONB NOT NULL,
    "verification" JSONB NOT NULL,

    CONSTRAINT "WorkerAttendanceEvent_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "TimesheetEvent" (
    "eventId" UUID NOT NULL,
    "aggregateId" UUID NOT NULL,
    "eventVersion" TEXT NOT NULL DEFAULT '1.0',
    "schemaVersion" TEXT NOT NULL DEFAULT '1.0',
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimesheetEvent_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "CommandInbox" (
    "commandId" TEXT NOT NULL,
    "processedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handlerName" TEXT NOT NULL,

    CONSTRAINT "CommandInbox_pkey" PRIMARY KEY ("commandId")
);

-- CreateTable
CREATE TABLE "TimeTrackingOutbox" (
    "id" UUID NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeTrackingOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectionCheckpoint" (
    "projectionName" TEXT NOT NULL,
    "lastEventId" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ProjectionCheckpoint_pkey" PRIMARY KEY ("projectionName")
);

-- CreateTable
CREATE TABLE "TimesheetProjection" (
    "id" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "payPeriodId" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "projectionVersion" TEXT NOT NULL DEFAULT '1.0',
    "calculationVersion" TEXT NOT NULL,
    "aggregateVersion" TEXT NOT NULL,
    "regularMinutes" INTEGER NOT NULL DEFAULT 0,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "holidayMinutes" INTEGER NOT NULL DEFAULT 0,
    "nightMinutes" INTEGER NOT NULL DEFAULT 0,
    "weekendMinutes" INTEGER NOT NULL DEFAULT 0,
    "leaveMinutes" INTEGER NOT NULL DEFAULT 0,
    "missingPunchMinutes" INTEGER NOT NULL DEFAULT 0,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "shiftVarianceMinutes" INTEGER NOT NULL DEFAULT 0,
    "snapshots" JSONB NOT NULL,
    "auditTrail" JSONB NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "TimesheetProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerPresence" (
    "workerId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMPTZ NOT NULL,
    "workContext" JSONB,
    "projectionVersion" TEXT NOT NULL DEFAULT '1.0',
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "WorkerPresence_pkey" PRIMARY KEY ("workerId")
);

-- CreateTable
CREATE TABLE "CorrectionInbox" (
    "commandId" TEXT NOT NULL,
    "processedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handlerName" TEXT NOT NULL,

    CONSTRAINT "CorrectionInbox_pkey" PRIMARY KEY ("commandId")
);

-- CreateTable
CREATE TABLE "CorrectionOutbox" (
    "id" UUID NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorrectionOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceCorrectionRequest" (
    "id" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "targetDate" DATE NOT NULL,
    "type" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "AttendanceCorrectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectionRevision" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "proposedChanges" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "policySnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorrectionRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceReference" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalWorkflow" (
    "id" UUID NOT NULL,
    "referenceAggregateId" UUID NOT NULL,
    "state" TEXT NOT NULL,
    "policySnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ApprovalWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalStep" (
    "id" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "level" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "approverId" UUID,
    "comments" TEXT,
    "resolvedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerCorrectionHistory" (
    "id" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "targetDate" DATE NOT NULL,
    "status" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "WorkerCorrectionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagerApprovalQueue" (
    "id" UUID NOT NULL,
    "managerId" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "submittedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ManagerApprovalQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingExceptions" (
    "id" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "exceptionType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "detectedAt" TIMESTAMPTZ NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "PendingExceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceAuditTimeline" (
    "id" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "targetDate" DATE NOT NULL,
    "eventType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "AttendanceAuditTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectionStatistics" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "month" TEXT NOT NULL,
    "totalCorrections" INTEGER NOT NULL DEFAULT 0,
    "autoApproved" INTEGER NOT NULL DEFAULT 0,
    "managerApproved" INTEGER NOT NULL DEFAULT 0,
    "rejected" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CorrectionStatistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceDashboard" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "metricName" TEXT NOT NULL,
    "metricValue" JSONB NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ComplianceDashboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollExportView" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "payPeriodId" UUID NOT NULL,
    "exportStatus" TEXT NOT NULL,
    "flattenedMetrics" JSONB NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "PayrollExportView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayPeriodProjection" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" TEXT NOT NULL,
    "totalWorkers" INTEGER NOT NULL,
    "approvedCount" INTEGER NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "PayPeriodProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerLeaveTimeline" (
    "id" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "leaveRequestId" UUID NOT NULL,
    "leaveTypeId" UUID NOT NULL,
    "startDate" TIMESTAMPTZ NOT NULL,
    "endDate" TIMESTAMPTZ NOT NULL,
    "status" TEXT NOT NULL,
    "projectionVersion" TEXT NOT NULL DEFAULT '1.0',
    "aggregateVersion" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "WorkerLeaveTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveBalanceDashboard" (
    "id" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "leaveTypeId" UUID NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "accrued" DOUBLE PRECISION NOT NULL,
    "deducted" DOUBLE PRECISION NOT NULL,
    "projectionVersion" TEXT NOT NULL DEFAULT '1.0',
    "aggregateVersion" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "LeaveBalanceDashboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamLeaveCalendar" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "managerId" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "leaveRequestId" UUID NOT NULL,
    "startDate" TIMESTAMPTZ NOT NULL,
    "endDate" TIMESTAMPTZ NOT NULL,
    "status" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "TeamLeaveCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationLeaveCalendar" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "leaveRequestId" UUID NOT NULL,
    "startDate" TIMESTAMPTZ NOT NULL,
    "endDate" TIMESTAMPTZ NOT NULL,
    "status" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "OrganizationLeaveCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentLeaveCalendar" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "leaveRequestId" UUID NOT NULL,
    "startDate" TIMESTAMPTZ NOT NULL,
    "endDate" TIMESTAMPTZ NOT NULL,
    "status" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "DepartmentLeaveCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveForecastProjection" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "month" TEXT NOT NULL,
    "totalLiability" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "LeaveForecastProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveAuditTimeline" (
    "id" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "ledgerId" UUID NOT NULL,
    "transactionType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "correlationId" TEXT NOT NULL,
    "causationId" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "LeaveAuditTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Calendar" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "referenceId" TEXT,
    "parentId" UUID,
    "aggregateVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Calendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" UUID NOT NULL,
    "calendarId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "baseDate" DATE NOT NULL,
    "rule" JSONB,
    "status" TEXT NOT NULL,
    "aggregateVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkWeekConfig" (
    "id" UUID NOT NULL,
    "calendarId" UUID NOT NULL,
    "pattern" JSONB NOT NULL,
    "aggregateVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "WorkWeekConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyCalendarFlattenedView" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "calendarId" UUID NOT NULL,
    "isHoliday" BOOLEAN NOT NULL,
    "isWeekend" BOOLEAN NOT NULL,
    "holidayName" TEXT,
    "holidayType" TEXT,
    "inheritedFrom" UUID,
    "projectionVersion" TEXT NOT NULL DEFAULT '1.0',
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "DailyCalendarFlattenedView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationYearlyCalendarView" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "projectionVersion" TEXT NOT NULL DEFAULT '1.0',
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "OrganizationYearlyCalendarView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "windows" JSONB NOT NULL,
    "aggregateVersion" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Capacity" (
    "id" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "maxHours" DOUBLE PRECISION NOT NULL,
    "consumedHours" DOUBLE PRECISION NOT NULL,
    "fatigueScore" DOUBLE PRECISION NOT NULL,
    "aggregateVersion" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Capacity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" UUID NOT NULL,
    "targetId" UUID NOT NULL,
    "requesterId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "aggregateVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerAvailabilityView" (
    "id" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "nextAvailableAt" TIMESTAMPTZ,
    "projectionVersion" TEXT NOT NULL DEFAULT '1.0',
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "WorkerAvailabilityView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamCapacityDashboard" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "totalCapacity" DOUBLE PRECISION NOT NULL,
    "consumedCapacity" DOUBLE PRECISION NOT NULL,
    "projectionVersion" TEXT NOT NULL DEFAULT '1.0',
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "TeamCapacityDashboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentAvailabilityProjection" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "availableCount" INTEGER NOT NULL,
    "reservedCount" INTEGER NOT NULL,
    "busyCount" INTEGER NOT NULL,
    "projectionVersion" TEXT NOT NULL DEFAULT '1.0',
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "DepartmentAvailabilityProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationCapacityView" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "macroMetrics" JSONB NOT NULL,
    "projectionVersion" TEXT NOT NULL DEFAULT '1.0',
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "OrganizationCapacityView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkforceRequirement" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "scopeId" UUID NOT NULL,
    "scopeType" TEXT NOT NULL,
    "timeSlot" JSONB NOT NULL,
    "coverage" JSONB NOT NULL,
    "aggregateVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "WorkforceRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Roster" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "scopeId" UUID NOT NULL,
    "scopeType" TEXT NOT NULL,
    "planningPeriod" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "aggregateVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Roster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RosterAssignment" (
    "id" UUID NOT NULL,
    "rosterId" UUID NOT NULL,
    "requirementId" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "timeSlot" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "complianceSnapshot" JSONB,
    "aggregateVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "RosterAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftSwapRequest" (
    "id" UUID NOT NULL,
    "requesterId" UUID NOT NULL,
    "receiverId" UUID,
    "assignmentId" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "aggregateVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ShiftSwapRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverageHeatmap" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "scopeId" UUID NOT NULL,
    "metrics" JSONB NOT NULL,
    "projectionVersion" TEXT NOT NULL DEFAULT '1.0',
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "CoverageHeatmap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerScheduleTimeline" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "timeline" JSONB NOT NULL,
    "projectionVersion" TEXT NOT NULL DEFAULT '1.0',
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "WorkerScheduleTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchRosterBoard" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "assignments" JSONB NOT NULL,
    "projectionVersion" TEXT NOT NULL DEFAULT '1.0',
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "BranchRosterBoard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationPlanningDashboard" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "period" TEXT NOT NULL,
    "macroMetrics" JSONB NOT NULL,
    "projectionVersion" TEXT NOT NULL DEFAULT '1.0',
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "OrganizationPlanningDashboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpcomingShiftAlerts" (
    "id" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "alertType" TEXT NOT NULL,
    "projectionVersion" TEXT NOT NULL DEFAULT '1.0',
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "UpcomingShiftAlerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchedulingConflicts" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "scopeId" UUID NOT NULL,
    "conflictDetails" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "projectionVersion" TEXT NOT NULL DEFAULT '1.0',
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "SchedulingConflicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftAdherence" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "shiftId" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "deviationMetrics" JSONB NOT NULL,
    "policySnapshot" JSONB NOT NULL,
    "aggregateVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ShiftAdherence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceInfraction" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "shiftAdherenceId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "pointValue" INTEGER NOT NULL DEFAULT 0,
    "disputeDetails" JSONB,
    "aggregateVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "AttendanceInfraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerReliabilityProfile" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "reliabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "tier" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "scoringVersion" TEXT NOT NULL,
    "policySnapshot" JSONB NOT NULL,
    "aggregateVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "WorkerReliabilityProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerScorecardView" (
    "id" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "tier" TEXT NOT NULL,
    "recentInfractions" JSONB NOT NULL,
    "calculationVersion" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "projectionVersion" TEXT NOT NULL DEFAULT '1.0',
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "WorkerScorecardView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamReliabilityProjection" (
    "id" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "metrics" JSONB NOT NULL,
    "projectionVersion" TEXT NOT NULL DEFAULT '1.0',
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "TeamReliabilityProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentReliabilityProjection" (
    "id" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "metrics" JSONB NOT NULL,
    "projectionVersion" TEXT NOT NULL DEFAULT '1.0',
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "DepartmentReliabilityProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchReliabilityProjection" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "metrics" JSONB NOT NULL,
    "projectionVersion" TEXT NOT NULL DEFAULT '1.0',
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "BranchReliabilityProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationReliabilityProjection" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "metrics" JSONB NOT NULL,
    "projectionVersion" TEXT NOT NULL DEFAULT '1.0',
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "OrganizationReliabilityProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceEvent" (
    "eventId" UUID NOT NULL,
    "aggregateId" UUID NOT NULL,
    "eventVersion" TEXT NOT NULL DEFAULT '1.0',
    "schemaVersion" TEXT NOT NULL DEFAULT '1.0',
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceEvent_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "WorkerCompliance" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "policySnapshot" JSONB NOT NULL,
    "aggregateVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "WorkerCompliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerCredential" (
    "id" UUID NOT NULL,
    "workerComplianceId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expiryDate" TIMESTAMPTZ,
    "credentialData" JSONB NOT NULL,
    "restrictionSet" JSONB,
    "aggregateVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "WorkerCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationAudit" (
    "id" UUID NOT NULL,
    "workerCredentialId" UUID NOT NULL,
    "verificationSource" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "auditDetails" JSONB NOT NULL,
    "verifiedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceExemption" (
    "id" UUID NOT NULL,
    "workerComplianceId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "grantedBy" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceExemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerComplianceDashboard" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "activeCredentials" JSONB NOT NULL,
    "expiringSoon" JSONB NOT NULL,
    "projectionVersion" TEXT NOT NULL DEFAULT '1.0',
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "WorkerComplianceDashboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationFeedView" (
    "id" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "notificationType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "projectionVersion" TEXT NOT NULL DEFAULT '1.0',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationFeedView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceAlertsDashboard" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "alertType" TEXT NOT NULL,
    "workerId" UUID NOT NULL,
    "details" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "projectionVersion" TEXT NOT NULL DEFAULT '1.0',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceAlertsDashboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationComplianceView" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "complianceRate" DOUBLE PRECISION NOT NULL,
    "totalWorkers" INTEGER NOT NULL,
    "nonCompliantCount" INTEGER NOT NULL,
    "projectionVersion" TEXT NOT NULL DEFAULT '1.0',
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "OrganizationComplianceView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceAuditTimeline" (
    "id" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "policySnapshot" JSONB NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ComplianceAuditTimeline_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_gstin_key" ON "organizations"("gstin");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_panNumber_key" ON "organizations"("panNumber");

-- CreateIndex
CREATE INDEX "organization_memberships_userId_idx" ON "organization_memberships"("userId");

-- CreateIndex
CREATE INDEX "organization_memberships_organizationId_idx" ON "organization_memberships"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_memberships_organizationId_userId_key" ON "organization_memberships"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_membership_invitations_tokenHash_key" ON "organization_membership_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "organization_membership_invitations_organizationId_phone_idx" ON "organization_membership_invitations"("organizationId", "phone");

-- CreateIndex
CREATE INDEX "organization_membership_invitations_tokenHash_idx" ON "organization_membership_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "organization_branches_organizationId_status_deletedAt_creat_idx" ON "organization_branches"("organizationId", "status", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "organization_branches_organizationId_deletedAt_createdAt_id_idx" ON "organization_branches"("organizationId", "deletedAt", "createdAt", "id");

-- CreateIndex
CREATE INDEX "organization_branches_name_idx" ON "organization_branches" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "organization_branches_managerId_idx" ON "organization_branches"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_branches_organizationId_code_key" ON "organization_branches"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "organization_branches_organizationId_name_key" ON "organization_branches"("organizationId", "name");

-- CreateIndex
CREATE INDEX "organization_departments_organizationId_branchId_status_del_idx" ON "organization_departments"("organizationId", "branchId", "status", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "organization_departments_branchId_deletedAt_createdAt_id_idx" ON "organization_departments"("branchId", "deletedAt", "createdAt", "id");

-- CreateIndex
CREATE INDEX "organization_departments_name_idx" ON "organization_departments" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "organization_departments_managerId_idx" ON "organization_departments"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_departments_branchId_code_key" ON "organization_departments"("branchId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "organization_departments_branchId_name_key" ON "organization_departments"("branchId", "name");

-- CreateIndex
CREATE INDEX "organization_designations_organizationId_status_deletedAt_c_idx" ON "organization_designations"("organizationId", "status", "deletedAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "organization_designations_organizationId_code_key" ON "organization_designations"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "organization_designations_organizationId_name_key" ON "organization_designations"("organizationId", "name");

-- CreateIndex
CREATE INDEX "organization_teams_organizationId_branchId_departmentId_sta_idx" ON "organization_teams"("organizationId", "branchId", "departmentId", "status", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "organization_teams_leaderId_idx" ON "organization_teams"("leaderId");

-- CreateIndex
CREATE INDEX "organization_teams_name_idx" ON "organization_teams" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "organization_teams_departmentId_code_key" ON "organization_teams"("departmentId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "organization_teams_departmentId_name_key" ON "organization_teams"("departmentId", "name");

-- CreateIndex
CREATE INDEX "organization_employment_types_organizationId_isActive_delet_idx" ON "organization_employment_types"("organizationId", "isActive", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "organization_employment_types_organizationId_code_key" ON "organization_employment_types"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "organization_employment_assignments_assignmentNumber_key" ON "organization_employment_assignments"("assignmentNumber");

-- CreateIndex
CREATE INDEX "organization_employment_assignments_membershipId_status_idx" ON "organization_employment_assignments"("membershipId", "status");

-- CreateIndex
CREATE INDEX "organization_employment_assignments_effectiveFrom_effective_idx" ON "organization_employment_assignments"("effectiveFrom", "effectiveUntil");

-- CreateIndex
CREATE INDEX "work_schedule_templates_organizationId_isActive_deletedAt_idx" ON "work_schedule_templates"("organizationId", "isActive", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "work_schedule_templates_organizationId_code_key" ON "work_schedule_templates"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "work_schedule_template_versions_templateId_versionNumber_key" ON "work_schedule_template_versions"("templateId", "versionNumber");

-- CreateIndex
CREATE INDEX "schedule_assignments_organizationId_targetType_targetId_sta_idx" ON "schedule_assignments"("organizationId", "targetType", "targetId", "status");

-- CreateIndex
CREATE INDEX "schedule_assignments_effectiveFrom_effectiveUntil_idx" ON "schedule_assignments"("effectiveFrom", "effectiveUntil");

-- CreateIndex
CREATE INDEX "ShiftGenerationJob_organizationId_idx" ON "ShiftGenerationJob"("organizationId");

-- CreateIndex
CREATE INDEX "ShiftGenerationJob_status_idx" ON "ShiftGenerationJob"("status");

-- CreateIndex
CREATE INDEX "ShiftInstance_organizationId_date_idx" ON "ShiftInstance"("organizationId", "date");

-- CreateIndex
CREATE INDEX "ShiftInstance_assignmentId_idx" ON "ShiftInstance"("assignmentId");

-- CreateIndex
CREATE INDEX "ShiftInstance_status_idx" ON "ShiftInstance"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftInstance_membershipId_date_key" ON "ShiftInstance"("membershipId", "date");

-- CreateIndex
CREATE INDEX "ShiftOverride_shiftId_idx" ON "ShiftOverride"("shiftId");

-- CreateIndex
CREATE INDEX "ShiftTimelineEvent_shiftId_idx" ON "ShiftTimelineEvent"("shiftId");

-- CreateIndex
CREATE INDEX "WorkerAttendanceEvent_aggregateId_idx" ON "WorkerAttendanceEvent"("aggregateId");

-- CreateIndex
CREATE INDEX "WorkerAttendanceEvent_organizationId_recordedAt_idx" ON "WorkerAttendanceEvent"("organizationId", "recordedAt");

-- CreateIndex
CREATE INDEX "TimesheetEvent_aggregateId_idx" ON "TimesheetEvent"("aggregateId");

-- CreateIndex
CREATE UNIQUE INDEX "TimeTrackingOutbox_eventId_key" ON "TimeTrackingOutbox"("eventId");

-- CreateIndex
CREATE INDEX "TimeTrackingOutbox_published_createdAt_idx" ON "TimeTrackingOutbox"("published", "createdAt");

-- CreateIndex
CREATE INDEX "TimesheetProjection_workerId_payPeriodId_idx" ON "TimesheetProjection"("workerId", "payPeriodId");

-- CreateIndex
CREATE INDEX "TimesheetProjection_payPeriodId_status_idx" ON "TimesheetProjection"("payPeriodId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CorrectionOutbox_eventId_key" ON "CorrectionOutbox"("eventId");

-- CreateIndex
CREATE INDEX "CorrectionOutbox_published_createdAt_idx" ON "CorrectionOutbox"("published", "createdAt");

-- CreateIndex
CREATE INDEX "WorkerCorrectionHistory_workerId_idx" ON "WorkerCorrectionHistory"("workerId");

-- CreateIndex
CREATE INDEX "ManagerApprovalQueue_managerId_status_idx" ON "ManagerApprovalQueue"("managerId", "status");

-- CreateIndex
CREATE INDEX "PendingExceptions_workerId_status_idx" ON "PendingExceptions"("workerId", "status");

-- CreateIndex
CREATE INDEX "AttendanceAuditTimeline_workerId_targetDate_idx" ON "AttendanceAuditTimeline"("workerId", "targetDate");

-- CreateIndex
CREATE UNIQUE INDEX "CorrectionStatistics_organizationId_month_key" ON "CorrectionStatistics"("organizationId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceDashboard_organizationId_metricName_key" ON "ComplianceDashboard"("organizationId", "metricName");

-- CreateIndex
CREATE INDEX "PayrollExportView_organizationId_exportStatus_idx" ON "PayrollExportView"("organizationId", "exportStatus");

-- CreateIndex
CREATE INDEX "PayPeriodProjection_organizationId_status_idx" ON "PayPeriodProjection"("organizationId", "status");

-- CreateIndex
CREATE INDEX "WorkerLeaveTimeline_workerId_status_idx" ON "WorkerLeaveTimeline"("workerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalanceDashboard_workerId_leaveTypeId_key" ON "LeaveBalanceDashboard"("workerId", "leaveTypeId");

-- CreateIndex
CREATE INDEX "TeamLeaveCalendar_managerId_startDate_idx" ON "TeamLeaveCalendar"("managerId", "startDate");

-- CreateIndex
CREATE INDEX "OrganizationLeaveCalendar_organizationId_startDate_idx" ON "OrganizationLeaveCalendar"("organizationId", "startDate");

-- CreateIndex
CREATE INDEX "DepartmentLeaveCalendar_departmentId_startDate_idx" ON "DepartmentLeaveCalendar"("departmentId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveForecastProjection_organizationId_month_key" ON "LeaveForecastProjection"("organizationId", "month");

-- CreateIndex
CREATE INDEX "LeaveAuditTimeline_workerId_timestamp_idx" ON "LeaveAuditTimeline"("workerId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Calendar_type_referenceId_key" ON "Calendar"("type", "referenceId");

-- CreateIndex
CREATE INDEX "Holiday_calendarId_baseDate_idx" ON "Holiday"("calendarId", "baseDate");

-- CreateIndex
CREATE UNIQUE INDEX "WorkWeekConfig_calendarId_key" ON "WorkWeekConfig"("calendarId");

-- CreateIndex
CREATE INDEX "DailyCalendarFlattenedView_calendarId_idx" ON "DailyCalendarFlattenedView"("calendarId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCalendarFlattenedView_date_calendarId_key" ON "DailyCalendarFlattenedView"("date", "calendarId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationYearlyCalendarView_organizationId_year_key" ON "OrganizationYearlyCalendarView"("organizationId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Availability_workerId_key" ON "Availability"("workerId");

-- CreateIndex
CREATE UNIQUE INDEX "Capacity_workerId_key" ON "Capacity"("workerId");

-- CreateIndex
CREATE INDEX "Reservation_targetId_status_idx" ON "Reservation"("targetId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerAvailabilityView_workerId_key" ON "WorkerAvailabilityView"("workerId");

-- CreateIndex
CREATE INDEX "WorkerAvailabilityView_organizationId_status_idx" ON "WorkerAvailabilityView"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TeamCapacityDashboard_organizationId_teamId_key" ON "TeamCapacityDashboard"("organizationId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentAvailabilityProjection_organizationId_departmentI_key" ON "DepartmentAvailabilityProjection"("organizationId", "departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationCapacityView_organizationId_key" ON "OrganizationCapacityView"("organizationId");

-- CreateIndex
CREATE INDEX "WorkforceRequirement_organizationId_scopeId_idx" ON "WorkforceRequirement"("organizationId", "scopeId");

-- CreateIndex
CREATE INDEX "Roster_organizationId_status_idx" ON "Roster"("organizationId", "status");

-- CreateIndex
CREATE INDEX "RosterAssignment_rosterId_idx" ON "RosterAssignment"("rosterId");

-- CreateIndex
CREATE INDEX "RosterAssignment_workerId_status_idx" ON "RosterAssignment"("workerId", "status");

-- CreateIndex
CREATE INDEX "ShiftSwapRequest_requesterId_idx" ON "ShiftSwapRequest"("requesterId");

-- CreateIndex
CREATE INDEX "CoverageHeatmap_organizationId_scopeId_idx" ON "CoverageHeatmap"("organizationId", "scopeId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerScheduleTimeline_workerId_key" ON "WorkerScheduleTimeline"("workerId");

-- CreateIndex
CREATE INDEX "WorkerScheduleTimeline_organizationId_idx" ON "WorkerScheduleTimeline"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "BranchRosterBoard_branchId_date_key" ON "BranchRosterBoard"("branchId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationPlanningDashboard_organizationId_period_key" ON "OrganizationPlanningDashboard"("organizationId", "period");

-- CreateIndex
CREATE INDEX "UpcomingShiftAlerts_workerId_idx" ON "UpcomingShiftAlerts"("workerId");

-- CreateIndex
CREATE INDEX "SchedulingConflicts_organizationId_status_idx" ON "SchedulingConflicts"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ShiftAdherence_organizationId_workerId_idx" ON "ShiftAdherence"("organizationId", "workerId");

-- CreateIndex
CREATE INDEX "ShiftAdherence_shiftId_idx" ON "ShiftAdherence"("shiftId");

-- CreateIndex
CREATE INDEX "AttendanceInfraction_organizationId_workerId_idx" ON "AttendanceInfraction"("organizationId", "workerId");

-- CreateIndex
CREATE INDEX "AttendanceInfraction_status_idx" ON "AttendanceInfraction"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerReliabilityProfile_workerId_key" ON "WorkerReliabilityProfile"("workerId");

-- CreateIndex
CREATE INDEX "WorkerReliabilityProfile_organizationId_idx" ON "WorkerReliabilityProfile"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerScorecardView_workerId_key" ON "WorkerScorecardView"("workerId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationReliabilityProjection_organizationId_key" ON "OrganizationReliabilityProjection"("organizationId");

-- CreateIndex
CREATE INDEX "ComplianceEvent_aggregateId_idx" ON "ComplianceEvent"("aggregateId");

-- CreateIndex
CREATE INDEX "ComplianceEvent_timestamp_idx" ON "ComplianceEvent"("timestamp");

-- CreateIndex
CREATE INDEX "WorkerCompliance_organizationId_status_idx" ON "WorkerCompliance"("organizationId", "status");

-- CreateIndex
CREATE INDEX "WorkerCredential_workerComplianceId_status_idx" ON "WorkerCredential"("workerComplianceId", "status");

-- CreateIndex
CREATE INDEX "WorkerCredential_expiryDate_idx" ON "WorkerCredential"("expiryDate");

-- CreateIndex
CREATE INDEX "VerificationAudit_workerCredentialId_idx" ON "VerificationAudit"("workerCredentialId");

-- CreateIndex
CREATE INDEX "ComplianceExemption_workerComplianceId_idx" ON "ComplianceExemption"("workerComplianceId");

-- CreateIndex
CREATE INDEX "ComplianceExemption_expiresAt_idx" ON "ComplianceExemption"("expiresAt");

-- CreateIndex
CREATE INDEX "WorkerComplianceDashboard_organizationId_idx" ON "WorkerComplianceDashboard"("organizationId");

-- CreateIndex
CREATE INDEX "NotificationFeedView_workerId_isRead_idx" ON "NotificationFeedView"("workerId", "isRead");

-- CreateIndex
CREATE INDEX "ComplianceAlertsDashboard_organizationId_status_idx" ON "ComplianceAlertsDashboard"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationComplianceView_organizationId_key" ON "OrganizationComplianceView"("organizationId");

-- CreateIndex
CREATE INDEX "ComplianceAuditTimeline_workerId_timestamp_idx" ON "ComplianceAuditTimeline"("workerId", "timestamp");

-- CreateIndex
CREATE INDEX "ComplianceAuditTimeline_organizationId_timestamp_idx" ON "ComplianceAuditTimeline"("organizationId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceScoringPolicy_policyId_version_organizationId_key" ON "PerformanceScoringPolicy"("policyId", "version", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerPerformanceCycle_workerId_membershipId_cycleId_key" ON "WorkerPerformanceCycle"("workerId", "membershipId", "cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerPerformanceDashboard_workerId_membershipId_cycleId_key" ON "WorkerPerformanceDashboard"("workerId", "membershipId", "cycleId");

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

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_membership_invitations" ADD CONSTRAINT "organization_membership_invitations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_membership_invitations" ADD CONSTRAINT "organization_membership_invitations_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_branches" ADD CONSTRAINT "organization_branches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_branches" ADD CONSTRAINT "organization_branches_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_departments" ADD CONSTRAINT "organization_departments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_departments" ADD CONSTRAINT "organization_departments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "organization_branches"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_departments" ADD CONSTRAINT "organization_departments_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_designations" ADD CONSTRAINT "organization_designations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_teams" ADD CONSTRAINT "organization_teams_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_teams" ADD CONSTRAINT "organization_teams_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "organization_branches"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_teams" ADD CONSTRAINT "organization_teams_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "organization_departments"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_teams" ADD CONSTRAINT "organization_teams_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_employment_types" ADD CONSTRAINT "organization_employment_types_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_employment_assignments" ADD CONSTRAINT "organization_employment_assignments_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "organization_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_employment_assignments" ADD CONSTRAINT "organization_employment_assignments_employmentTypeId_fkey" FOREIGN KEY ("employmentTypeId") REFERENCES "organization_employment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_employment_assignments" ADD CONSTRAINT "organization_employment_assignments_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "organization_designations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_employment_assignments" ADD CONSTRAINT "organization_employment_assignments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "organization_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_employment_assignments" ADD CONSTRAINT "organization_employment_assignments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "organization_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_employment_assignments" ADD CONSTRAINT "organization_employment_assignments_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "organization_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_schedule_templates" ADD CONSTRAINT "work_schedule_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_schedule_template_versions" ADD CONSTRAINT "work_schedule_template_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "work_schedule_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_scheduleTemplateVersionId_fkey" FOREIGN KEY ("scheduleTemplateVersionId") REFERENCES "work_schedule_template_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftOverride" ADD CONSTRAINT "ShiftOverride_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "ShiftInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftTimelineEvent" ADD CONSTRAINT "ShiftTimelineEvent_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "ShiftInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionRevision" ADD CONSTRAINT "CorrectionRevision_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AttendanceCorrectionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceReference" ADD CONSTRAINT "EvidenceReference_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AttendanceCorrectionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ApprovalWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerCredential" ADD CONSTRAINT "WorkerCredential_workerComplianceId_fkey" FOREIGN KEY ("workerComplianceId") REFERENCES "WorkerCompliance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationAudit" ADD CONSTRAINT "VerificationAudit_workerCredentialId_fkey" FOREIGN KEY ("workerCredentialId") REFERENCES "WorkerCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceExemption" ADD CONSTRAINT "ComplianceExemption_workerComplianceId_fkey" FOREIGN KEY ("workerComplianceId") REFERENCES "WorkerCompliance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerPerformanceCycle" ADD CONSTRAINT "WorkerPerformanceCycle_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "organization_memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceScoringPolicy" ADD CONSTRAINT "PerformanceScoringPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerPerformanceDashboard" ADD CONSTRAINT "WorkerPerformanceDashboard_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "organization_memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerPerformanceDashboard" ADD CONSTRAINT "WorkerPerformanceDashboard_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

