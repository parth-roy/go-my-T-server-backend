import { BaseDomainEvent } from './events/WorkerPerformanceEvents';
import { PerformanceScoringPolicyCreatedEvent, PerformanceScoringPolicyActivatedEvent, PerformanceScoringPolicyArchivedEvent } from './events/PerformanceScoringPolicyEvents';

export type PolicyStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export class PerformanceScoringPolicy {
  public id: string;
  public policyId: string;
  public version: string;
  public effectiveFrom: Date;
  public effectiveTo: Date | null;
  public status: PolicyStatus;
  public okrWeight: number;
  public adherenceWeight: number;
  public ratingThresholds: any;

  private _uncommittedEvents: BaseDomainEvent[] = [];
  public aggregateVersion: number;

  constructor(
    id: string,
    policyId: string,
    version: string,
    effectiveFrom: Date,
    okrWeight: number,
    adherenceWeight: number,
    ratingThresholds: any,
    aggregateVersion: number = 1
  ) {
    if (okrWeight < 0 || okrWeight > 1) {
      throw new Error('okrWeight must be between 0 and 1');
    }
    if (adherenceWeight < 0 || adherenceWeight > 1) {
      throw new Error('adherenceWeight must be between 0 and 1');
    }
    if (Math.abs(okrWeight + adherenceWeight - 1.0) > 0.0001) {
      throw new Error('okrWeight and adherenceWeight must sum to 1');
    }

    this.id = id;
    this.policyId = policyId;
    this.version = version;
    this.effectiveFrom = effectiveFrom;
    this.effectiveTo = null;
    this.status = 'DRAFT';
    this.okrWeight = okrWeight;
    this.adherenceWeight = adherenceWeight;
    this.ratingThresholds = ratingThresholds;
    this.aggregateVersion = aggregateVersion;
  }

  public static create(
    id: string,
    policyId: string,
    version: string,
    effectiveFrom: Date,
    okrWeight: number,
    adherenceWeight: number,
    ratingThresholds: any,
    correlationId?: string,
    causationId?: string
  ): PerformanceScoringPolicy {
    const policy = new PerformanceScoringPolicy(id, policyId, version, effectiveFrom, okrWeight, adherenceWeight, ratingThresholds, 1);
    
    policy.addDomainEvent(
      new PerformanceScoringPolicyCreatedEvent(
        crypto.randomUUID(),
        policy.policyId,
        policy.aggregateVersion,
        new Date(),
        {
          version: policy.version,
          effectiveFrom: policy.effectiveFrom,
          okrWeight: policy.okrWeight,
          adherenceWeight: policy.adherenceWeight,
          ratingThresholds: policy.ratingThresholds,
        },
        { correlationId, causationId }
      )
    );

    return policy;
  }

  public activate(correlationId?: string, causationId?: string): void {
    if (this.status !== 'DRAFT') {
      throw new Error('Only DRAFT policies can be activated');
    }
    this.status = 'ACTIVE';
    this.incrementVersion();
    this.addDomainEvent(
      new PerformanceScoringPolicyActivatedEvent(
        crypto.randomUUID(),
        this.policyId,
        this.aggregateVersion,
        new Date(),
        {},
        { correlationId, causationId }
      )
    );
  }

  public archive(reason?: string, correlationId?: string, causationId?: string): void {
    if (this.status !== 'ACTIVE') {
      throw new Error('Only ACTIVE policies can be archived');
    }
    this.status = 'ARCHIVED';
    this.effectiveTo = new Date();
    
    this.incrementVersion();
    this.addDomainEvent(
      new PerformanceScoringPolicyArchivedEvent(
        crypto.randomUUID(),
        this.policyId,
        this.aggregateVersion,
        new Date(),
        { reason },
        { correlationId, causationId }
      )
    );
  }

  private incrementVersion(): void {
    this.aggregateVersion += 1;
  }

  private addDomainEvent(event: BaseDomainEvent): void {
    this._uncommittedEvents.push(event);
  }

  public getUncommittedEvents(): BaseDomainEvent[] {
    return [...this._uncommittedEvents];
  }

  public clearUncommittedEvents(): void {
    this._uncommittedEvents = [];
  }
}
