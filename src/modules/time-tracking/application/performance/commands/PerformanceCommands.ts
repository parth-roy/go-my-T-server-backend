import { EvaluationRatingValue } from '../../../domain/aggregates/performance/value-objects/EvaluationRating.vo';
import { CycleStatus } from '../../../domain/aggregates/performance/WorkerPerformanceCycle.aggregate';

// WorkerPerformanceCycle Commands
export class CreateWorkerPerformanceCycleCommand {
  constructor(
    public readonly workerId: string,
    public readonly cycleId: string,
    public readonly correlationId?: string,
    public readonly causationId?: string
  ) {}
}

export class CloseWorkerPerformanceCycleCommand {
  constructor(
    public readonly workerId: string,
    public readonly reason?: string,
    public readonly correlationId?: string,
    public readonly causationId?: string
  ) {}
}

export class ReopenWorkerPerformanceCycleCommand {
  constructor(
    public readonly workerId: string,
    public readonly reason?: string,
    public readonly correlationId?: string,
    public readonly causationId?: string
  ) {}
}

// Objectives & Key Results
export class AddWorkerObjectiveCommand {
  constructor(
    public readonly workerId: string,
    public readonly objectiveId: string,
    public readonly title: string,
    public readonly weight: number,
    public readonly description?: string,
    public readonly correlationId?: string,
    public readonly causationId?: string
  ) {}
}

export class AddKeyResultCommand {
  constructor(
    public readonly workerId: string,
    public readonly objectiveId: string,
    public readonly keyResultId: string,
    public readonly title: string,
    public readonly targetValue: number,
    public readonly unit: string,
    public readonly correlationId?: string,
    public readonly causationId?: string
  ) {}
}

export class UpdateKeyResultProgressCommand {
  constructor(
    public readonly workerId: string,
    public readonly objectiveId: string,
    public readonly keyResultId: string,
    public readonly currentValue: number,
    public readonly correlationId?: string,
    public readonly causationId?: string
  ) {}
}

// Manager Evaluation
export class SubmitManagerEvaluationCommand {
  constructor(
    public readonly workerId: string,
    public readonly evaluationId: string,
    public readonly managerId: string,
    public readonly rating: EvaluationRatingValue,
    public readonly feedbackEncrypted?: string,
    public readonly encryptionKeyId?: string,
    public readonly correlationId?: string,
    public readonly causationId?: string
  ) {}
}

// Calibration
export class ApplyCalibrationAdjustmentCommand {
  constructor(
    public readonly workerId: string,
    public readonly newRating: EvaluationRatingValue,
    public readonly reason: string,
    public readonly hrUserId: string,
    public readonly correlationId?: string,
    public readonly causationId?: string
  ) {}
}

// Scoring
export class ScoreWorkerPerformanceCycleCommand {
  constructor(
    public readonly workerId: string,
    public readonly correlationId?: string,
    public readonly causationId?: string
  ) {}
}

// Performance Scoring Policy
export class CreatePerformanceScoringPolicyCommand {
  constructor(
    public readonly policyId: string,
    public readonly version: string,
    public readonly effectiveFrom: Date,
    public readonly okrWeight: number,
    public readonly adherenceWeight: number,
    public readonly ratingThresholds: any,
    public readonly correlationId?: string,
    public readonly causationId?: string
  ) {}
}

export class ActivatePerformanceScoringPolicyCommand {
  constructor(
    public readonly policyId: string,
    public readonly correlationId?: string,
    public readonly causationId?: string
  ) {}
}

export class ArchivePerformanceScoringPolicyCommand {
  constructor(
    public readonly policyId: string,
    public readonly reason?: string,
    public readonly correlationId?: string,
    public readonly causationId?: string
  ) {}
}
