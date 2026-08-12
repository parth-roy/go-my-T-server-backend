import crypto from 'crypto';
import { WorkerObjective } from './entities/WorkerObjective.entity';
import { ManagerEvaluation } from './entities/ManagerEvaluation.entity';
import { KeyResult } from './entities/KeyResult.entity';
import { EvaluationRatingValue } from './value-objects/EvaluationRating.vo';
import { AdherenceSnapshot } from './value-objects/AdherenceSnapshot.vo';
import {
  BaseDomainEvent,
  WorkerPerformanceCycleStartedEvent,
  WorkerObjectiveAddedEvent,
  KeyResultAddedEvent,
  KeyResultProgressUpdatedEvent,
  ManagerEvaluationSubmittedEvent,
  WorkerPerformanceCalibratedEvent,
  WorkerPerformanceCycleScoredEvent,
  WorkerPerformanceCycleClosedEvent,
  WorkerPerformanceCycleReopenedEvent,
} from './events/WorkerPerformanceEvents';

export type CycleStatus = 'DRAFT' | 'ACTIVE' | 'MANAGER_REVIEW' | 'CALIBRATING' | 'CLOSED' | 'HISTORICAL_LOCKED';

export class WorkerPerformanceCycle {
  public id: string;
  public workerId: string;
  public cycleId: string;
  public status: CycleStatus;
  
  public finalScore: number | null;
  public finalRating: EvaluationRatingValue | null;
  public adherenceSnapshot: AdherenceSnapshot | null;
  public policySnapshot: any | null;
  
  public objectives: WorkerObjective[];
  public evaluations: ManagerEvaluation[];

  private _uncommittedEvents: BaseDomainEvent[] = [];
  public aggregateVersion: number;

  constructor(
    id: string,
    workerId: string,
    cycleId: string,
    status: CycleStatus = 'DRAFT',
    aggregateVersion: number = 1
  ) {
    this.id = id;
    this.workerId = workerId;
    this.cycleId = cycleId;
    this.status = status;
    this.finalScore = null;
    this.finalRating = null;
    this.adherenceSnapshot = null;
    this.policySnapshot = null;
    this.objectives = [];
    this.evaluations = [];
    this.aggregateVersion = aggregateVersion;
  }

  public static start(
    id: string,
    workerId: string,
    cycleId: string,
    correlationId?: string,
    causationId?: string
  ): WorkerPerformanceCycle {
    const cycle = new WorkerPerformanceCycle(id, workerId, cycleId, 'ACTIVE', 1);
    cycle.addDomainEvent(
      new WorkerPerformanceCycleStartedEvent(
        crypto.randomUUID(),
        cycle.id,
        cycle.aggregateVersion,
        new Date(),
        { workerId, cycleId },
        { correlationId, causationId }
      )
    );
    return cycle;
  }

  public addObjective(
    objectiveId: string,
    title: string,
    description: string | null,
    weight: number,
    correlationId?: string,
    causationId?: string
  ): void {
    this.ensureNotClosed();
    const objective = new WorkerObjective(objectiveId, title, description, weight);
    this.objectives.push(objective);

    this.incrementVersion();
    this.addDomainEvent(
      new WorkerObjectiveAddedEvent(
        crypto.randomUUID(),
        this.id,
        this.aggregateVersion,
        new Date(),
        { objectiveId, title, description: description ?? undefined, weight },
        { correlationId, causationId }
      )
    );
  }

  public addKeyResult(
    objectiveId: string,
    keyResultId: string,
    title: string,
    targetValue: number,
    unit: string,
    correlationId?: string,
    causationId?: string
  ): void {
    this.ensureNotClosed();

    const objective = this.objectives.find((o) => o.id === objectiveId);
    if (!objective) {
      throw new Error('Objective not found');
    }

    const kr = new KeyResult(keyResultId, title, targetValue, unit);
    objective.addKeyResult(kr);

    this.incrementVersion();
    this.addDomainEvent(
      new KeyResultAddedEvent(
        crypto.randomUUID(),
        this.id,
        this.aggregateVersion,
        new Date(),
        { objectiveId, keyResultId, title, targetValue, unit },
        { correlationId, causationId }
      )
    );
  }

  public updateKeyResultProgress(
    objectiveId: string,
    keyResultId: string,
    currentValue: number,
    correlationId?: string,
    causationId?: string
  ): void {
    this.ensureNotClosed();
    const objective = this.objectives.find((o) => o.id === objectiveId);
    if (!objective) throw new Error('Objective not found');

    objective.updateKeyResultProgress(keyResultId, currentValue);

    this.incrementVersion();
    this.addDomainEvent(
      new KeyResultProgressUpdatedEvent(
        crypto.randomUUID(),
        this.id,
        this.aggregateVersion,
        new Date(),
        { objectiveId, keyResultId, currentValue },
        { correlationId, causationId }
      )
    );
  }

  public submitManagerEvaluation(
    evaluationId: string,
    managerId: string,
    rating: EvaluationRatingValue,
    feedbackEncrypted: string | null,
    encryptionKeyId?: string,
    correlationId?: string,
    causationId?: string
  ): void {
    this.ensureNotClosed();
    // Validate state transition
    if (this.status !== 'ACTIVE' && this.status !== 'MANAGER_REVIEW') {
      throw new Error(`Cannot submit evaluation in status ${this.status}`);
    }
    this.status = 'MANAGER_REVIEW';

    const evaluation = new ManagerEvaluation(evaluationId, managerId, rating, feedbackEncrypted);
    this.evaluations.push(evaluation);

    this.incrementVersion();
    this.addDomainEvent(
      new ManagerEvaluationSubmittedEvent(
        crypto.randomUUID(),
        this.id,
        this.aggregateVersion,
        new Date(),
        { evaluationId, managerId, rating, feedbackEncrypted: feedbackEncrypted ?? undefined },
        { correlationId, causationId, encryptionKeyId }
      )
    );
  }

  public calibrate(
    newRating: EvaluationRatingValue,
    reason: string,
    correlationId?: string,
    causationId?: string
  ): void {
    if (this.status !== 'MANAGER_REVIEW' && this.status !== 'CALIBRATING') {
      throw new Error(`Cannot calibrate in status ${this.status}`);
    }
    this.status = 'CALIBRATING';
    // Calibration overrides the final rating if set, or just sets it
    this.finalRating = newRating;

    this.incrementVersion();
    this.addDomainEvent(
      new WorkerPerformanceCalibratedEvent(
        crypto.randomUUID(),
        this.id,
        this.aggregateVersion,
        new Date(),
        { newRating, reason },
        { correlationId, causationId }
      )
    );
  }

  public score(
    finalScore: number,
    finalRating: EvaluationRatingValue,
    okrScore: number,
    adherenceSnapshot: AdherenceSnapshot,
    policySnapshot: any,
    correlationId?: string,
    causationId?: string
  ): void {
    this.ensureNotClosed();
    
    this.finalScore = finalScore;
    this.finalRating = finalRating;
    this.adherenceSnapshot = adherenceSnapshot;
    this.policySnapshot = policySnapshot;
    this.status = 'CLOSED';

    this.incrementVersion();
    this.addDomainEvent(
      new WorkerPerformanceCycleScoredEvent(
        crypto.randomUUID(),
        this.id,
        this.aggregateVersion,
        new Date(),
        {
          workerId: this.workerId,
          cycleId: this.cycleId,
          finalScore,
          finalRating,
          okrScore,
          adherenceSnapshot,
          scoringPolicySnapshot: policySnapshot,
          calculationTimestamp: new Date()
        },
        { correlationId, causationId }
      )
    );
  }

  public close(
    reason?: string,
    correlationId?: string,
    causationId?: string
  ): void {
    this.ensureNotClosed();
    this.status = 'CLOSED';

    this.incrementVersion();
    this.addDomainEvent(
      new WorkerPerformanceCycleClosedEvent(
        crypto.randomUUID(),
        this.id,
        this.aggregateVersion,
        new Date(),
        {
          workerId: this.workerId,
          cycleId: this.cycleId,
          reason,
        },
        { correlationId, causationId }
      )
    );
  }

  public reopen(
    reason?: string,
    correlationId?: string,
    causationId?: string
  ): void {
    if (this.status !== 'CLOSED') {
      throw new Error('WorkerPerformanceCycle is not closed and cannot be reopened');
    }
    
    // Reset final score and rating upon reopen, but leave adherence/policy snapshots
    // depending on business rules (reopening usually implies rescoring/reevaluating).
    this.finalScore = null;
    this.finalRating = null;
    this.status = 'ACTIVE';

    this.incrementVersion();
    this.addDomainEvent(
      new WorkerPerformanceCycleReopenedEvent(
        crypto.randomUUID(),
        this.id,
        this.aggregateVersion,
        new Date(),
        {
          workerId: this.workerId,
          cycleId: this.cycleId,
          reason,
        },
        { correlationId, causationId }
      )
    );
  }

  private ensureNotClosed(): void {
    if (this.status === 'CLOSED' || this.status === 'HISTORICAL_LOCKED') {
      throw new Error('WorkerPerformanceCycle is closed or locked and cannot be modified');
    }
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
