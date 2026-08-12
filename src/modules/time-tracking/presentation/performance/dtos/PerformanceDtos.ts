import { EvaluationRatingValue } from '../../../domain/aggregates/performance/value-objects/EvaluationRating.vo';

// Cycle DTOs
export class CreateWorkerPerformanceCycleDto {
  workerId!: string;
  cycleId!: string;
}

export class CloseWorkerPerformanceCycleDto {
  workerId!: string;
  reason?: string;
}

export class ReopenWorkerPerformanceCycleDto {
  workerId!: string;
  reason?: string;
}

// Objective DTOs
export class AddWorkerObjectiveDto {
  workerId!: string;
  objectiveId!: string;
  title!: string;
  weight!: number;
  description?: string;
}

export class AddKeyResultDto {
  workerId!: string;
  objectiveId!: string;
  keyResultId!: string;
  title!: string;
  targetValue!: number;
  unit!: string;
}

export class UpdateKeyResultProgressDto {
  workerId!: string;
  objectiveId!: string;
  keyResultId!: string;
  currentValue!: number;
}

// Evaluation DTOs
export class SubmitManagerEvaluationDto {
  workerId!: string;
  evaluationId!: string;
  rating!: EvaluationRatingValue;
  feedbackEncrypted?: string;
  encryptionKeyId?: string;
}

export class ApplyCalibrationAdjustmentDto {
  workerId!: string;
  newRating!: EvaluationRatingValue;
  reason!: string;
}

export class ScoreWorkerPerformanceCycleDto {
  workerId!: string;
}

// Policy DTOs
export class CreatePerformanceScoringPolicyDto {
  policyId!: string;
  version!: string;
  effectiveFrom!: Date;
  okrWeight!: number;
  adherenceWeight!: number;
  ratingThresholds!: any;
}

export class ActivatePerformanceScoringPolicyDto {
  policyId!: string;
}

export class ArchivePerformanceScoringPolicyDto {
  policyId!: string;
  reason?: string;
}
