import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PerformanceApplicationService } from '../services/PerformanceApplicationService';
import { WorkerPerformanceCycle } from '../../../domain/aggregates/performance/WorkerPerformanceCycle.aggregate';
import { PerformanceScoringPolicy } from '../../../domain/aggregates/performance/PerformanceScoringPolicy.aggregate';
import {
  CreateWorkerPerformanceCycleCommand,
  ScoreWorkerPerformanceCycleCommand,
  AddWorkerObjectiveCommand,
  AddKeyResultCommand,
  CloseWorkerPerformanceCycleCommand,
  ReopenWorkerPerformanceCycleCommand,
  ArchivePerformanceScoringPolicyCommand
} from '../commands/PerformanceCommands';
import {
  WorkerPerformanceCycleRepository,
  PerformanceScoringPolicyRepository,
  WorkerAdherenceReadModelRepository,
  PerformanceEventOutboxService,
  PerformanceAuthorizationService
} from '../interfaces/Repositories';
import { AdherenceSnapshot } from '../../../domain/aggregates/performance/value-objects/AdherenceSnapshot.vo';

class MockCycleRepository implements WorkerPerformanceCycleRepository {
  public cycles = new Map<string, WorkerPerformanceCycle>();
  
  async findById(workerId: string) { return this.cycles.get(workerId) || null; }
  async save(cycle: WorkerPerformanceCycle, tx: any) { this.cycles.set(cycle.id, cycle); }
  async beginTransaction() { return { id: 'tx-1' }; }
  async commitTransaction(tx: any) {}
  async rollbackTransaction(tx: any) {}
}

class MockPolicyRepository implements PerformanceScoringPolicyRepository {
  public policies = new Map<string, PerformanceScoringPolicy>();
  public activePolicy: PerformanceScoringPolicy | null = null;
  
  async findById(policyId: string) { return this.policies.get(policyId) || null; }
  async findActivePolicy() { return this.activePolicy; }
  async save(policy: PerformanceScoringPolicy, tx: any) { this.policies.set(policy.id, policy); }
}

class MockAdherenceRepository implements WorkerAdherenceReadModelRepository {
  public latestAdherence: any = null;
  async getLatestAdherenceForWorker(workerId: string) { return this.latestAdherence; }
}

class MockOutboxService implements PerformanceEventOutboxService {
  public events: any[] = [];
  async publish(events: ReadonlyArray<any>, tx: any) { this.events.push(...events); }
}

class MockAuthService implements PerformanceAuthorizationService {
  public failMode = false;
  async checkPermission(actorId: string, action: string, resourceId: string) {
    if (this.failMode) throw new Error('Unauthorized');
  }
}

describe('PerformanceApplicationService', () => {
  let cycleRepo: MockCycleRepository;
  let policyRepo: MockPolicyRepository;
  let adherenceRepo: MockAdherenceRepository;
  let outbox: MockOutboxService;
  let auth: MockAuthService;
  let service: PerformanceApplicationService;

  beforeEach(() => {
    cycleRepo = new MockCycleRepository();
    policyRepo = new MockPolicyRepository();
    adherenceRepo = new MockAdherenceRepository();
    outbox = new MockOutboxService();
    auth = new MockAuthService();

    service = new PerformanceApplicationService(
      cycleRepo,
      policyRepo,
      adherenceRepo,
      outbox,
      auth
    );
  });

  it('should create a performance cycle and publish event', async () => {
    const cmd = new CreateWorkerPerformanceCycleCommand('worker-1', 'cycle-1');
    
    await service.createWorkerPerformanceCycle(cmd);
    
    const cycle = await cycleRepo.findById('worker-1');
    expect(cycle).toBeDefined();
    expect(cycle?.status).toBe('ACTIVE');
    
    expect(outbox.events.length).toBe(1);
    expect(outbox.events[0].eventType).toBe('WorkerPerformanceCycleStartedEvent');
  });

  it('should enforce authorization on create cycle', async () => {
    auth.failMode = true;
    const cmd = new CreateWorkerPerformanceCycleCommand('worker-1', 'cycle-1');
    
    await expect(service.createWorkerPerformanceCycle(cmd)).rejects.toThrow('Unauthorized');
    const cycle = await cycleRepo.findById('worker-1');
    expect(cycle).toBeNull(); // transaction rolled back / not started
  });

  it('should score performance cycle with deterministic adherence', async () => {
    // Setup Policy
    const policy = PerformanceScoringPolicy.create('policy-1', 'policy-1', '1.0', new Date(), 0.7, 0.3, [
      { minScore: 90, rating: 'OUTSTANDING' },
      { minScore: 50, rating: 'MEETS_EXPECTATIONS' },
      { minScore: 0, rating: 'UNSATISFACTORY' }
    ]);
    policy.activate();
    policyRepo.activePolicy = policy;

    // Setup Cycle
    const cycle = WorkerPerformanceCycle.start('worker-1', 'worker-1', 'cycle-1');
    cycle.clearUncommittedEvents();
    cycleRepo.cycles.set('worker-1', cycle);

    // Setup Adherence
    adherenceRepo.latestAdherence = {
      score: 100,
      policyVersion: '1.0',
      windowStart: new Date('2026-01-01'),
      windowEnd: new Date('2026-01-31'),
      status: 'CALCULATED'
    };

    const cmd = new ScoreWorkerPerformanceCycleCommand('worker-1');
    await service.scoreWorkerPerformanceCycle(cmd);

    const updatedCycle = await cycleRepo.findById('worker-1');
    expect(updatedCycle?.status).toBe('CLOSED');
    
    // OKR = 0 (no objectives), Adherence = 100
    // Score = 0*0.7 + 100*0.3 = 30 -> UNSATISFACTORY
    expect(updatedCycle?.finalScore).toBe(30);
    expect(updatedCycle?.finalRating).toBe('UNSATISFACTORY');

    expect(outbox.events.length).toBe(1);
    expect(outbox.events[0].eventType).toBe('WorkerPerformanceCycleScoredEvent');
    expect(outbox.events[0].payload.adherenceSnapshot.score).toBe(100);
  });

  it('should score performance cycle with 0.0 fallback if adherence is PENDING or missing', async () => {
    const cycle = WorkerPerformanceCycle.start('worker-1', 'worker-1', 'cycle-1');
    cycle.clearUncommittedEvents();
    cycleRepo.cycles.set('worker-1', cycle);
    policyRepo.activePolicy = PerformanceScoringPolicy.create('p-1', 'p-1', '1.0', new Date(), 0.7, 0.3, [
      { minScore: 50, rating: 'MEETS_EXPECTATIONS' },
      { minScore: 0, rating: 'UNSATISFACTORY' }
    ]);
    policyRepo.activePolicy.activate();

    adherenceRepo.latestAdherence = {
      status: 'PENDING'
    };

    const cmd = new ScoreWorkerPerformanceCycleCommand('worker-1');
    await service.scoreWorkerPerformanceCycle(cmd);

    const updatedCycle = await cycleRepo.findById('worker-1');
    expect(updatedCycle?.finalScore).toBe(0);
    expect(outbox.events[0].payload.adherenceSnapshot.score).toBe(0.0);
  });

  it('should commit transaction only if domain operations succeed', async () => {
    const cmd = new AddWorkerObjectiveCommand('worker-1', 'obj-1', 'Title', 1.0);
    
    // Fails because cycle does not exist
    await expect(service.addObjective(cmd)).rejects.toThrow('WorkerPerformanceCycle not found');
    
    expect(outbox.events.length).toBe(0); // Nothing published
  });

  describe('CLOSED-cycle idempotency in creation', () => {
    it('duplicate creation against an existing ACTIVE cycle should be rejected', async () => {
      const cycle = WorkerPerformanceCycle.start('worker-1', 'worker-1', 'cycle-1');
      cycleRepo.cycles.set('worker-1', cycle);

      const cmd = new CreateWorkerPerformanceCycleCommand('worker-1', 'cycle-2');
      await expect(service.createWorkerPerformanceCycle(cmd))
        .rejects.toThrow('WorkerPerformanceCycle already exists and is not closed for worker worker-1');
    });

    it('duplicate creation against an existing CLOSED cycle with same ID should be rejected', async () => {
      const cycle = WorkerPerformanceCycle.start('worker-1', 'worker-1', 'cycle-1');
      cycle.close();
      cycleRepo.cycles.set('worker-1', cycle);

      const cmd = new CreateWorkerPerformanceCycleCommand('worker-1', 'cycle-1');
      await expect(service.createWorkerPerformanceCycle(cmd))
        .rejects.toThrow('WorkerPerformanceCycle already exists for worker worker-1 and cycle cycle-1');
    });
  });

  describe('Add Key Result', () => {
    it('should successfully add key result and publish event', async () => {
      const cycle = WorkerPerformanceCycle.start('worker-1', 'worker-1', 'cycle-1');
      cycle.addObjective('obj-1', 'Title', null, 1.0);
      cycle.clearUncommittedEvents();
      cycleRepo.cycles.set('worker-1', cycle);

      const cmd = new AddKeyResultCommand('worker-1', 'obj-1', 'kr-1', 'KR Title', 10, 'units');
      await service.addKeyResult(cmd);

      const updatedCycle = await cycleRepo.findById('worker-1');
      const kr = updatedCycle?.objectives.find(o => o.id === 'obj-1')?.keyResults.find(k => k.id === 'kr-1');
      
      expect(kr).toBeDefined();
      expect(kr?.title).toBe('KR Title');
      expect(outbox.events.length).toBe(1);
      expect(outbox.events[0].eventType).toBe('KeyResultAddedEvent');
    });

    it('should fail on authorization', async () => {
      auth.failMode = true;
      const cmd = new AddKeyResultCommand('worker-1', 'obj-1', 'kr-1', 'KR Title', 10, 'units');
      await expect(service.addKeyResult(cmd)).rejects.toThrow('Unauthorized');
      expect(outbox.events.length).toBe(0);
    });

    it('should rollback on missing cycle', async () => {
      const cmd = new AddKeyResultCommand('worker-1', 'obj-1', 'kr-1', 'KR Title', 10, 'units');
      await expect(service.addKeyResult(cmd)).rejects.toThrow('WorkerPerformanceCycle not found');
      expect(outbox.events.length).toBe(0);
    });

    it('should rollback on invalid objective', async () => {
      const cycle = WorkerPerformanceCycle.start('worker-1', 'worker-1', 'cycle-1');
      cycleRepo.cycles.set('worker-1', cycle);

      const cmd = new AddKeyResultCommand('worker-1', 'non-existent', 'kr-1', 'KR Title', 10, 'units');
      await expect(service.addKeyResult(cmd)).rejects.toThrow('Objective not found');
      expect(outbox.events.length).toBe(0);
    });
  });

  describe('Close Worker Performance Cycle', () => {
    it('should close successfully and publish event', async () => {
      const cycle = WorkerPerformanceCycle.start('worker-1', 'worker-1', 'cycle-1');
      cycle.clearUncommittedEvents();
      cycleRepo.cycles.set('worker-1', cycle);

      const cmd = new CloseWorkerPerformanceCycleCommand('worker-1', 'reason');
      await service.closeWorkerPerformanceCycle(cmd);

      const updated = await cycleRepo.findById('worker-1');
      expect(updated?.status).toBe('CLOSED');
      expect(outbox.events.length).toBe(1);
      expect(outbox.events[0].eventType).toBe('WorkerPerformanceCycleClosedEvent');
    });

    it('should fail on authorization', async () => {
      auth.failMode = true;
      const cmd = new CloseWorkerPerformanceCycleCommand('worker-1', 'reason');
      await expect(service.closeWorkerPerformanceCycle(cmd)).rejects.toThrow('Unauthorized');
      expect(outbox.events.length).toBe(0);
    });

    it('should rollback on repository or domain failure', async () => {
      // Cycle doesn't exist, will throw in getCycleOrThrow
      const cmd = new CloseWorkerPerformanceCycleCommand('worker-1', 'reason');
      await expect(service.closeWorkerPerformanceCycle(cmd)).rejects.toThrow('WorkerPerformanceCycle not found');
      expect(outbox.events.length).toBe(0);
    });
  });

  describe('Reopen Worker Performance Cycle', () => {
    it('should reopen successfully and publish event', async () => {
      const cycle = WorkerPerformanceCycle.start('worker-1', 'worker-1', 'cycle-1');
      cycle.close();
      cycle.clearUncommittedEvents();
      cycleRepo.cycles.set('worker-1', cycle);

      const cmd = new ReopenWorkerPerformanceCycleCommand('worker-1', 'reason');
      await service.reopenWorkerPerformanceCycle(cmd);

      const updated = await cycleRepo.findById('worker-1');
      expect(updated?.status).toBe('ACTIVE');
      expect(outbox.events.length).toBe(1);
      expect(outbox.events[0].eventType).toBe('WorkerPerformanceCycleReopenedEvent');
    });

    it('should fail on authorization', async () => {
      auth.failMode = true;
      const cmd = new ReopenWorkerPerformanceCycleCommand('worker-1', 'reason');
      await expect(service.reopenWorkerPerformanceCycle(cmd)).rejects.toThrow('Unauthorized');
    });

    it('should rollback on repository or domain failure', async () => {
      const cycle = WorkerPerformanceCycle.start('worker-1', 'worker-1', 'cycle-1');
      cycleRepo.cycles.set('worker-1', cycle);
      // Domain will throw because it's not closed
      const cmd = new ReopenWorkerPerformanceCycleCommand('worker-1', 'reason');
      await expect(service.reopenWorkerPerformanceCycle(cmd)).rejects.toThrow('WorkerPerformanceCycle is not closed and cannot be reopened');
      expect(outbox.events.length).toBe(0);
    });
  });

  describe('Archive Scoring Policy', () => {
    it('should archive successfully and publish event', async () => {
      const policy = PerformanceScoringPolicy.create('p-1', 'p-1', '1.0', new Date(), 0.5, 0.5, {});
      policy.activate();
      policy.clearUncommittedEvents();
      policyRepo.policies.set('p-1', policy);

      const cmd = new ArchivePerformanceScoringPolicyCommand('p-1', 'deprecated');
      await service.archivePerformanceScoringPolicy(cmd);

      const updated = await policyRepo.findById('p-1');
      expect(updated?.status).toBe('ARCHIVED');
      expect(outbox.events.length).toBe(1);
      expect(outbox.events[0].eventType).toBe('PerformanceScoringPolicyArchivedEvent');
    });

    it('should fail on authorization', async () => {
      auth.failMode = true;
      const cmd = new ArchivePerformanceScoringPolicyCommand('p-1', 'deprecated');
      await expect(service.archivePerformanceScoringPolicy(cmd)).rejects.toThrow('Unauthorized');
    });

    it('should rollback on repository or domain failure', async () => {
      const cmd = new ArchivePerformanceScoringPolicyCommand('p-1', 'deprecated');
      await expect(service.archivePerformanceScoringPolicy(cmd)).rejects.toThrow('Policy not found');
      expect(outbox.events.length).toBe(0);
    });
  });
});
