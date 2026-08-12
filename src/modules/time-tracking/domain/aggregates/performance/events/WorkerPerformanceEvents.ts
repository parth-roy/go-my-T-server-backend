import { EvaluationRatingValue } from '../value-objects/EvaluationRating.vo';

export interface BaseDomainEvent {
  eventType: string;
  eventId: string;
  aggregateId: string;
  aggregateVersion: number;
  timestamp: Date;
  metadata: {
    correlationId?: string;
    causationId?: string;
    encryptionKeyId?: string;
  };
}

export class WorkerPerformanceCycleStartedEvent implements BaseDomainEvent {
  public readonly eventType = 'WorkerPerformanceCycleStartedEvent';
  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly aggregateVersion: number,
    public readonly timestamp: Date,
    public readonly payload: {
      workerId: string;
      cycleId: string;
    },
    public readonly metadata: any = {}
  ) {}
}

export class WorkerObjectiveAddedEvent implements BaseDomainEvent {
  public readonly eventType = 'WorkerObjectiveAddedEvent';
  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly aggregateVersion: number,
    public readonly timestamp: Date,
    public readonly payload: {
      objectiveId: string;
      title: string;
      description?: string;
      weight: number;
    },
    public readonly metadata: any = {}
  ) {}
}

export class KeyResultAddedEvent implements BaseDomainEvent {
  public readonly eventType = 'KeyResultAddedEvent';
  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly aggregateVersion: number,
    public readonly timestamp: Date,
    public readonly payload: {
      objectiveId: string;
      keyResultId: string;
      title: string;
      targetValue: number;
      unit: string;
    },
    public readonly metadata: any = {}
  ) {}
}

export class KeyResultProgressUpdatedEvent implements BaseDomainEvent {
  public readonly eventType = 'KeyResultProgressUpdatedEvent';
  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly aggregateVersion: number,
    public readonly timestamp: Date,
    public readonly payload: {
      objectiveId: string;
      keyResultId: string;
      currentValue: number;
    },
    public readonly metadata: any = {}
  ) {}
}

export class ManagerEvaluationSubmittedEvent implements BaseDomainEvent {
  public readonly eventType = 'ManagerEvaluationSubmittedEvent';
  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly aggregateVersion: number,
    public readonly timestamp: Date,
    public readonly payload: {
      evaluationId: string;
      managerId: string;
      rating: EvaluationRatingValue;
      feedbackEncrypted?: string;
    },
    public readonly metadata: any = {}
  ) {}
}

export class WorkerPerformanceCalibratedEvent implements BaseDomainEvent {
  public readonly eventType = 'WorkerPerformanceCalibratedEvent';
  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly aggregateVersion: number,
    public readonly timestamp: Date,
    public readonly payload: {
      newRating: EvaluationRatingValue;
      reason: string;
    },
    public readonly metadata: any = {}
  ) {}
}

export class WorkerPerformanceCycleScoredEvent implements BaseDomainEvent {
  public readonly eventType = 'WorkerPerformanceCycleScoredEvent';
  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly aggregateVersion: number,
    public readonly timestamp: Date,
    public readonly payload: {
      workerId: string;
      cycleId: string;
      finalScore: number;
      finalRating: EvaluationRatingValue;
      okrScore: number;
      adherenceSnapshot: any; // Full snapshot of adherence used
      scoringPolicySnapshot: any; // Full snapshot of PerformanceScoringPolicy
      calculationTimestamp: Date;
    },
    public readonly metadata: any = {}
  ) {}
}

export class WorkerPerformanceCycleClosedEvent implements BaseDomainEvent {
  public readonly eventType = 'WorkerPerformanceCycleClosedEvent';
  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly aggregateVersion: number,
    public readonly timestamp: Date,
    public readonly payload: {
      workerId: string;
      cycleId: string;
      reason?: string;
    },
    public readonly metadata: any = {}
  ) {}
}

export class WorkerPerformanceCycleReopenedEvent implements BaseDomainEvent {
  public readonly eventType = 'WorkerPerformanceCycleReopenedEvent';
  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly aggregateVersion: number,
    public readonly timestamp: Date,
    public readonly payload: {
      workerId: string;
      cycleId: string;
      reason?: string;
    },
    public readonly metadata: any = {}
  ) {}
}
