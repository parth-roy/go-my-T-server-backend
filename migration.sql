-- DropTable
DROP TABLE "test_saga_state";

-- CreateTable
CREATE TABLE "time_performance_events" (
    "eventId" UUID NOT NULL,
    "aggregateId" UUID NOT NULL,
    "aggregateVersion" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_performance_events_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "WorkerPerformanceCycle" (
    "id" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "cycleId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "finalScore" DOUBLE PRECISION,
    "finalRating" TEXT,
    "adherenceSnapshot" JSONB,
    "policySnapshot" JSONB,
    "aggregateVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "WorkerPerformanceCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerObjective" (
    "id" UUID NOT NULL,
    "workerPerformanceCycleId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "status" TEXT NOT NULL,
    "aggregateVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "WorkerObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeyResult" (
    "id" UUID NOT NULL,
    "workerObjectiveId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "unit" TEXT NOT NULL,
    "aggregateVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "KeyResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagerEvaluation" (
    "id" UUID NOT NULL,
    "workerPerformanceCycleId" UUID NOT NULL,
    "managerId" UUID NOT NULL,
    "rating" TEXT NOT NULL,
    "feedbackEncrypted" TEXT,
    "aggregateVersion" INTEGER NOT NULL DEFAULT 1,
    "submittedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagerEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceScoringPolicy" (
    "id" UUID NOT NULL,
    "policyId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMPTZ NOT NULL,
    "effectiveTo" TIMESTAMPTZ,
    "status" TEXT NOT NULL,
    "okrWeight" DOUBLE PRECISION NOT NULL,
    "adherenceWeight" DOUBLE PRECISION NOT NULL,
    "ratingThresholds" JSONB NOT NULL,
    "aggregateVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "PerformanceScoringPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerAdherenceReadModel" (
    "id" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "windowStart" TIMESTAMPTZ NOT NULL,
    "windowEnd" TIMESTAMPTZ NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "aggregateVersion" INTEGER NOT NULL,
    "calculatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "WorkerAdherenceReadModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerPerformanceDashboard" (
    "id" UUID NOT NULL,
    "workerId" UUID NOT NULL,
    "cycleId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "objectivesProgress" JSONB NOT NULL,
    "latestAdherenceSnapshot" JSONB,
    "projectionVersion" TEXT NOT NULL DEFAULT '1.0',
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "WorkerPerformanceDashboard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "time_performance_events_aggregateId_aggregateVersion_idx" ON "time_performance_events"("aggregateId", "aggregateVersion");

-- CreateIndex
CREATE INDEX "time_performance_events_timestamp_idx" ON "time_performance_events"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "time_performance_events_aggregateId_aggregateVersion_key" ON "time_performance_events"("aggregateId", "aggregateVersion");

-- CreateIndex
CREATE INDEX "WorkerPerformanceCycle_workerId_status_idx" ON "WorkerPerformanceCycle"("workerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerPerformanceCycle_workerId_cycleId_key" ON "WorkerPerformanceCycle"("workerId", "cycleId");

-- CreateIndex
CREATE INDEX "WorkerObjective_workerPerformanceCycleId_idx" ON "WorkerObjective"("workerPerformanceCycleId");

-- CreateIndex
CREATE INDEX "KeyResult_workerObjectiveId_idx" ON "KeyResult"("workerObjectiveId");

-- CreateIndex
CREATE INDEX "ManagerEvaluation_workerPerformanceCycleId_idx" ON "ManagerEvaluation"("workerPerformanceCycleId");

-- CreateIndex
CREATE INDEX "PerformanceScoringPolicy_status_idx" ON "PerformanceScoringPolicy"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceScoringPolicy_policyId_version_key" ON "PerformanceScoringPolicy"("policyId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerAdherenceReadModel_workerId_windowStart_windowEnd_key" ON "WorkerAdherenceReadModel"("workerId", "windowStart", "windowEnd");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerPerformanceDashboard_workerId_cycleId_key" ON "WorkerPerformanceDashboard"("workerId", "cycleId");

-- AddForeignKey
ALTER TABLE "WorkerObjective" ADD CONSTRAINT "WorkerObjective_workerPerformanceCycleId_fkey" FOREIGN KEY ("workerPerformanceCycleId") REFERENCES "WorkerPerformanceCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeyResult" ADD CONSTRAINT "KeyResult_workerObjectiveId_fkey" FOREIGN KEY ("workerObjectiveId") REFERENCES "WorkerObjective"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerEvaluation" ADD CONSTRAINT "ManagerEvaluation_workerPerformanceCycleId_fkey" FOREIGN KEY ("workerPerformanceCycleId") REFERENCES "WorkerPerformanceCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

