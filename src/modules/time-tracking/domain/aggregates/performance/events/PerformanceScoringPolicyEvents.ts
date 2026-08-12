import { BaseDomainEvent } from './WorkerPerformanceEvents';

export class PerformanceScoringPolicyCreatedEvent implements BaseDomainEvent {
  public readonly eventType = 'PerformanceScoringPolicyCreatedEvent';
  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string, // policyId
    public readonly aggregateVersion: number,
    public readonly timestamp: Date,
    public readonly payload: {
      version: string;
      effectiveFrom: Date;
      effectiveTo?: Date;
      okrWeight: number;
      adherenceWeight: number;
      ratingThresholds: any;
    },
    public readonly metadata: any = {}
  ) {}
}

export class PerformanceScoringPolicyActivatedEvent implements BaseDomainEvent {
  public readonly eventType = 'PerformanceScoringPolicyActivatedEvent';
  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly aggregateVersion: number,
    public readonly timestamp: Date,
    public readonly payload: {},
    public readonly metadata: any = {}
  ) {}
}

export class PerformanceScoringPolicyArchivedEvent implements BaseDomainEvent {
  public readonly eventType = 'PerformanceScoringPolicyArchivedEvent';
  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly aggregateVersion: number,
    public readonly timestamp: Date,
    public readonly payload: {
      reason?: string;
    },
    public readonly metadata: any = {}
  ) {}
}

