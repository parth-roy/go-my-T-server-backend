-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('COMPANY', 'CONTRACTOR', 'VENDOR', 'OTHER');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OrgVerifStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('PRIMARY_OWNER', 'ORG_ADMIN', 'HR', 'SUPERVISOR', 'EMPLOYEE', 'VIEWER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'TERMINATED');

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
CREATE TYPE "ShiftGenerationTrigger" AS ENUM ('MANUAL', 'CRON', 'SCHEDULE_CHANGED', 'ASSIGNMENT_CHANGED', 'RETRY');

-- CreateEnum
CREATE TYPE "ShiftGenerationJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ShiftLifecycleStatus" AS ENUM ('DRAFT', 'GENERATED', 'PUBLISHED', 'ACKNOWLEDGED', 'CHECKIN_OPEN', 'IN_PROGRESS', 'CHECKOUT_PENDING', 'COMPLETED', 'MISSED', 'EXPIRED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ShiftOverrideStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ShiftTimelineEventType" AS ENUM ('GENERATED', 'PUBLISHED', 'VIEWED', 'ACCEPTED', 'OVERRIDE_APPLIED', 'CHECKIN', 'BREAK_START', 'BREAK_END', 'CHECKOUT', 'APPROVED', 'PAYROLL_LOCKED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "TemplateVersionStatus" AS ENUM ('DRAFT', 'VALIDATED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ScheduleTargetType" AS ENUM ('ORGANIZATION', 'BRANCH', 'DEPARTMENT', 'TEAM', 'ASSIGNMENT');

-- CreateEnum
CREATE TYPE "ScheduleAssignmentReason" AS ENUM ('DEFAULT', 'TRANSFER', 'TEMP_OVERRIDE', 'PROJECT', 'SEASONAL', 'EMERGENCY', 'MANUAL');

-- DropIndex
DROP INDEX "time_performance_events_aggregateId_aggregateVersion_key";

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
CREATE TABLE "ShiftGenerationJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
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
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
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
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "status" "ShiftOverrideStatus" NOT NULL,
    "overrideStartTime" TIMESTAMPTZ,
    "overrideEndTime" TIMESTAMPTZ,
    "reason" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ShiftOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftTimelineEvent" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "eventType" "ShiftTimelineEventType" NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "ShiftTimelineEvent_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "CommandInbox" (
    "commandId" TEXT NOT NULL,
    "processedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handlerName" TEXT NOT NULL,

    CONSTRAINT "CommandInbox_pkey" PRIMARY KEY ("commandId")
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
CREATE TABLE "ProjectionCheckpoint" (
    "projectionName" TEXT NOT NULL,
    "lastEventId" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ProjectionCheckpoint_pkey" PRIMARY KEY ("projectionName")
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
CREATE INDEX "organization_designations_organizationId_status_deletedAt_c_idx" ON "organization_designations"("organizationId", "status", "deletedAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "organization_designations_organizationId_code_key" ON "organization_designations"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "organization_designations_organizationId_name_key" ON "organization_designations"("organizationId", "name");

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
CREATE INDEX "schedule_assignments_organizationId_targetType_targetId_sta_idx" ON "schedule_assignments"("organizationId", "targetType", "targetId", "status");

-- CreateIndex
CREATE INDEX "schedule_assignments_effectiveFrom_effectiveUntil_idx" ON "schedule_assignments"("effectiveFrom", "effectiveUntil");

-- CreateIndex
CREATE INDEX "WorkerCompliance_organizationId_status_idx" ON "WorkerCompliance"("organizationId", "status");

-- CreateIndex
CREATE INDEX "WorkerComplianceDashboard_organizationId_idx" ON "WorkerComplianceDashboard"("organizationId");

-- CreateIndex
CREATE INDEX "WorkerCredential_workerComplianceId_status_idx" ON "WorkerCredential"("workerComplianceId", "status");

-- CreateIndex
CREATE INDEX "WorkerCredential_expiryDate_idx" ON "WorkerCredential"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "TimeTrackingOutbox_eventId_key" ON "TimeTrackingOutbox"("eventId");

-- CreateIndex
CREATE INDEX "TimeTrackingOutbox_published_createdAt_idx" ON "TimeTrackingOutbox"("published", "createdAt");

-- CreateIndex
CREATE INDEX "WorkerAttendanceEvent_aggregateId_idx" ON "WorkerAttendanceEvent"("aggregateId");

-- CreateIndex
CREATE INDEX "WorkerAttendanceEvent_organizationId_recordedAt_idx" ON "WorkerAttendanceEvent"("organizationId", "recordedAt");

-- CreateIndex
CREATE INDEX "ComplianceExemption_workerComplianceId_idx" ON "ComplianceExemption"("workerComplianceId");

-- CreateIndex
CREATE INDEX "ComplianceExemption_expiresAt_idx" ON "ComplianceExemption"("expiresAt");

-- CreateIndex
CREATE INDEX "VerificationAudit_workerCredentialId_idx" ON "VerificationAudit"("workerCredentialId");

-- CreateIndex
CREATE INDEX "ComplianceEvent_aggregateId_idx" ON "ComplianceEvent"("aggregateId");

-- CreateIndex
CREATE INDEX "ComplianceEvent_timestamp_idx" ON "ComplianceEvent"("timestamp");

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
ALTER TABLE "organization_teams" ADD CONSTRAINT "organization_teams_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_teams" ADD CONSTRAINT "organization_teams_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "organization_branches"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_teams" ADD CONSTRAINT "organization_teams_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "organization_departments"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_teams" ADD CONSTRAINT "organization_teams_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_designations" ADD CONSTRAINT "organization_designations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "ShiftGenerationJob" ADD CONSTRAINT "ShiftGenerationJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftInstance" ADD CONSTRAINT "ShiftInstance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftInstance" ADD CONSTRAINT "ShiftInstance_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "organization_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftInstance" ADD CONSTRAINT "ShiftInstance_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "organization_employment_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftOverride" ADD CONSTRAINT "ShiftOverride_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftOverride" ADD CONSTRAINT "ShiftOverride_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftOverride" ADD CONSTRAINT "ShiftOverride_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "ShiftInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftTimelineEvent" ADD CONSTRAINT "ShiftTimelineEvent_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "ShiftInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_scheduleTemplateVersionId_fkey" FOREIGN KEY ("scheduleTemplateVersionId") REFERENCES "work_schedule_template_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerCredential" ADD CONSTRAINT "WorkerCredential_workerComplianceId_fkey" FOREIGN KEY ("workerComplianceId") REFERENCES "WorkerCompliance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceExemption" ADD CONSTRAINT "ComplianceExemption_workerComplianceId_fkey" FOREIGN KEY ("workerComplianceId") REFERENCES "WorkerCompliance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationAudit" ADD CONSTRAINT "VerificationAudit_workerCredentialId_fkey" FOREIGN KEY ("workerCredentialId") REFERENCES "WorkerCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

