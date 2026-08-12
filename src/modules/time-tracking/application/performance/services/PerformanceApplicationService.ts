import { WorkerPerformanceCycle } from '../../../domain/aggregates/performance/WorkerPerformanceCycle.aggregate';
import { PerformanceScoringPolicy } from '../../../domain/aggregates/performance/PerformanceScoringPolicy.aggregate';
import { PerformanceScoringEngine } from '../../../domain/aggregates/performance/services/PerformanceScoringEngine';
import { AdherenceSnapshot } from '../../../domain/aggregates/performance/value-objects/AdherenceSnapshot.vo';
import {
  WorkerPerformanceCycleRepository,
  PerformanceScoringPolicyRepository,
  WorkerAdherenceReadModelRepository,
  PerformanceEventOutboxService,
  PerformanceAuthorizationService
} from '../interfaces/Repositories';
import {
  CreateWorkerPerformanceCycleCommand,
  CloseWorkerPerformanceCycleCommand,
  ReopenWorkerPerformanceCycleCommand,
  AddWorkerObjectiveCommand,
  AddKeyResultCommand,
  UpdateKeyResultProgressCommand,
  SubmitManagerEvaluationCommand,
  ApplyCalibrationAdjustmentCommand,
  ScoreWorkerPerformanceCycleCommand,
  CreatePerformanceScoringPolicyCommand,
  ActivatePerformanceScoringPolicyCommand,
  ArchivePerformanceScoringPolicyCommand
} from '../commands/PerformanceCommands';
import crypto from 'crypto';

export class PerformanceApplicationService {
  constructor(
    private cycleRepo: WorkerPerformanceCycleRepository,
    private policyRepo: PerformanceScoringPolicyRepository,
    private adherenceRepo: WorkerAdherenceReadModelRepository,
    private outbox: PerformanceEventOutboxService,
    private authService: PerformanceAuthorizationService,
    private readonly currentActorId: string = 'system'
  ) {}

  public async createWorkerPerformanceCycle(command: CreateWorkerPerformanceCycleCommand): Promise<void> {
    await this.authService.checkPermission(this.currentActorId, 'CREATE_CYCLE', command.workerId);

    const existing = await this.cycleRepo.findById(command.workerId);
    if (existing) {
      if (existing.cycleId === command.cycleId) {
        throw new Error(`WorkerPerformanceCycle already exists for worker ${command.workerId} and cycle ${command.cycleId}`);
      }
      if (existing.status !== 'CLOSED') {
        throw new Error(`WorkerPerformanceCycle already exists and is not closed for worker ${command.workerId}`);
      }
    }

    const cycle = WorkerPerformanceCycle.start(
      command.workerId, // aggregateId = workerId for 1:1 relation
      command.workerId,
      command.cycleId,
      command.correlationId,
      command.causationId
    );

    await this.saveCycleAndPublish(cycle);
  }

  public async addObjective(command: AddWorkerObjectiveCommand): Promise<void> {
    await this.authService.checkPermission(this.currentActorId, 'MANAGE_OBJECTIVE', command.workerId);
    const cycle = await this.getCycleOrThrow(command.workerId);

    cycle.addObjective(
      command.objectiveId,
      command.title,
      command.description || null,
      command.weight,
      command.correlationId,
      command.causationId
    );

    await this.saveCycleAndPublish(cycle);
  }

  public async addKeyResult(command: AddKeyResultCommand): Promise<void> {
    await this.authService.checkPermission(this.currentActorId, 'MANAGE_OBJECTIVE', command.workerId);
    const cycle = await this.getCycleOrThrow(command.workerId);

    cycle.addKeyResult(
      command.objectiveId,
      command.keyResultId,
      command.title,
      command.targetValue,
      command.unit,
      command.correlationId,
      command.causationId
    );

    await this.saveCycleAndPublish(cycle);
  }

  public async updateKeyResultProgress(command: UpdateKeyResultProgressCommand): Promise<void> {
    await this.authService.checkPermission(this.currentActorId, 'UPDATE_KR', command.workerId);
    const cycle = await this.getCycleOrThrow(command.workerId);

    cycle.updateKeyResultProgress(
      command.objectiveId,
      command.keyResultId,
      command.currentValue,
      command.correlationId,
      command.causationId
    );

    await this.saveCycleAndPublish(cycle);
  }

  public async submitManagerEvaluation(command: SubmitManagerEvaluationCommand): Promise<void> {
    await this.authService.checkPermission(command.managerId, 'SUBMIT_EVALUATION', command.workerId);
    const cycle = await this.getCycleOrThrow(command.workerId);

    cycle.submitManagerEvaluation(
      command.evaluationId,
      command.managerId,
      command.rating,
      command.feedbackEncrypted || null,
      command.encryptionKeyId,
      command.correlationId,
      command.causationId
    );

    await this.saveCycleAndPublish(cycle);
  }

  public async calibrate(command: ApplyCalibrationAdjustmentCommand): Promise<void> {
    await this.authService.checkPermission(command.hrUserId, 'CALIBRATE', command.workerId);
    const cycle = await this.getCycleOrThrow(command.workerId);

    cycle.calibrate(
      command.newRating,
      command.reason,
      command.correlationId,
      command.causationId
    );

    await this.saveCycleAndPublish(cycle);
  }

  public async scoreWorkerPerformanceCycle(command: ScoreWorkerPerformanceCycleCommand): Promise<void> {
    await this.authService.checkPermission(this.currentActorId, 'SCORE_CYCLE', command.workerId);
    const cycle = await this.getCycleOrThrow(command.workerId);

    const policy = await this.policyRepo.findActivePolicy();
    if (!policy) {
      throw new Error('No active PerformanceScoringPolicy found');
    }

    const adherenceData = await this.adherenceRepo.getLatestAdherenceForWorker(command.workerId);
    let adherenceSnapshot: AdherenceSnapshot;

    if (!adherenceData || adherenceData.status === 'PENDING') {
      // Missing or pending adherence data defaults to 0.0 per architectural specification
      const fallbackStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default window start (30 days ago)
      adherenceSnapshot = AdherenceSnapshot.create(
        0.0,
        policy.version,
        fallbackStart,
        new Date(), // Default window end
        new Date(),
        'CALCULATED'
      );
    } else {
      adherenceSnapshot = AdherenceSnapshot.create(
        adherenceData.score,
        adherenceData.policyVersion,
        adherenceData.windowStart,
        adherenceData.windowEnd,
        new Date(),
        'CALCULATED'
      );
    }

    // Naive OKR calculation for phase 3 example
    let okrScore = 0;
    for (const obj of cycle.objectives) {
      let objProgress = 0;
      if (obj.keyResults.length > 0) {
        const sum = obj.keyResults.reduce((acc, kr) => acc + (kr.currentValue / kr.targetValue) * 100, 0);
        objProgress = sum / obj.keyResults.length;
      }
      okrScore += (objProgress * obj.weight);
    }
    okrScore = Math.min(100, okrScore);

    const result = PerformanceScoringEngine.calculate(okrScore, adherenceSnapshot, policy);

    cycle.score(
      result.finalScore,
      result.finalRating,
      okrScore,
      adherenceSnapshot,
      {
        version: policy.version,
        effectiveFrom: policy.effectiveFrom,
        okrWeight: policy.okrWeight,
        adherenceWeight: policy.adherenceWeight,
        ratingThresholds: policy.ratingThresholds
      },
      command.correlationId,
      command.causationId
    );

    await this.saveCycleAndPublish(cycle);
  }

  public async closeWorkerPerformanceCycle(command: CloseWorkerPerformanceCycleCommand): Promise<void> {
    await this.authService.checkPermission(this.currentActorId, 'MANAGE_CYCLE', command.workerId);
    const cycle = await this.getCycleOrThrow(command.workerId);

    cycle.close(command.reason, command.correlationId, command.causationId);

    await this.saveCycleAndPublish(cycle);
  }

  public async reopenWorkerPerformanceCycle(command: ReopenWorkerPerformanceCycleCommand): Promise<void> {
    await this.authService.checkPermission(this.currentActorId, 'MANAGE_CYCLE', command.workerId);
    const cycle = await this.getCycleOrThrow(command.workerId);

    cycle.reopen(command.reason, command.correlationId, command.causationId);

    await this.saveCycleAndPublish(cycle);
  }


  public async createScoringPolicy(command: CreatePerformanceScoringPolicyCommand): Promise<void> {
    await this.authService.checkPermission(this.currentActorId, 'MANAGE_POLICY', command.policyId);

    const policy = PerformanceScoringPolicy.create(
      command.policyId,
      command.policyId,
      command.version,
      command.effectiveFrom,
      command.okrWeight,
      command.adherenceWeight,
      command.ratingThresholds,
      command.correlationId,
      command.causationId
    );

    const tx = await this.cycleRepo.beginTransaction();
    try {
      await this.policyRepo.save(policy, tx);
      const events = policy.getUncommittedEvents();
      await this.outbox.publish(events, tx);
      policy.clearUncommittedEvents();
      await this.cycleRepo.commitTransaction(tx);
    } catch (err) {
      await this.cycleRepo.rollbackTransaction(tx);
      throw err;
    }
  }

  public async activateScoringPolicy(command: ActivatePerformanceScoringPolicyCommand): Promise<void> {
    await this.authService.checkPermission(this.currentActorId, 'MANAGE_POLICY', command.policyId);
    
    const policy = await this.policyRepo.findById(command.policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${command.policyId}`);
    }

    policy.activate(command.correlationId, command.causationId);

    const tx = await this.cycleRepo.beginTransaction();
    try {
      await this.policyRepo.save(policy, tx);
      const events = policy.getUncommittedEvents();
      await this.outbox.publish(events, tx);
      policy.clearUncommittedEvents();
      await this.cycleRepo.commitTransaction(tx);
    } catch (err) {
      await this.cycleRepo.rollbackTransaction(tx);
      throw err;
    }
  }

  public async archivePerformanceScoringPolicy(command: ArchivePerformanceScoringPolicyCommand): Promise<void> {
    await this.authService.checkPermission(this.currentActorId, 'MANAGE_POLICY', command.policyId);
    
    const policy = await this.policyRepo.findById(command.policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${command.policyId}`);
    }

    policy.archive(command.reason, command.correlationId, command.causationId);

    const tx = await this.cycleRepo.beginTransaction();
    try {
      await this.policyRepo.save(policy, tx);
      const events = policy.getUncommittedEvents();
      await this.outbox.publish(events, tx);
      policy.clearUncommittedEvents();
      await this.cycleRepo.commitTransaction(tx);
    } catch (err) {
      await this.cycleRepo.rollbackTransaction(tx);
      throw err;
    }
  }

  // Helpers
  private async getCycleOrThrow(workerId: string): Promise<WorkerPerformanceCycle> {
    const cycle = await this.cycleRepo.findById(workerId);
    if (!cycle) {
      throw new Error(`WorkerPerformanceCycle not found for ${workerId}`);
    }
    return cycle;
  }

  private async saveCycleAndPublish(cycle: WorkerPerformanceCycle): Promise<void> {
    const tx = await this.cycleRepo.beginTransaction();
    try {
      await this.cycleRepo.save(cycle, tx);
      const events = cycle.getUncommittedEvents();
      await this.outbox.publish(events, tx);
      cycle.clearUncommittedEvents();
      await this.cycleRepo.commitTransaction(tx);
    } catch (error) {
      await this.cycleRepo.rollbackTransaction(tx);
      throw error;
    }
  }
}
