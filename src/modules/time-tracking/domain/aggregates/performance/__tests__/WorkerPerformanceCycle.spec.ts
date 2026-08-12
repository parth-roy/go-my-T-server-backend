import { describe, it, expect } from 'vitest';
import { WorkerPerformanceCycle } from '../WorkerPerformanceCycle.aggregate';
import { AdherenceSnapshot } from '../value-objects/AdherenceSnapshot.vo';
import { KeyResult } from '../entities/KeyResult.entity';

describe('WorkerPerformanceCycle Aggregate', () => {
  it('should create a cycle in ACTIVE state', () => {
    const cycle = WorkerPerformanceCycle.start('cycle-1', 'worker-1', 'cycle-id-1', 'mem-1');
    expect(cycle.id).toBe('cycle-1');
    expect(cycle.status).toBe('ACTIVE');
    expect(cycle.aggregateVersion).toBe(1);

    const events = cycle.getUncommittedEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe('WorkerPerformanceCycleStartedEvent');
  });

  it('should add an objective and key result', () => {
    const cycle = WorkerPerformanceCycle.start('cycle-1', 'worker-1', 'cycle-id-1', 'mem-1');
    cycle.clearUncommittedEvents();

    cycle.addObjective('obj-1', 'Deliver fast', null, 1.0);
    expect(cycle.objectives.length).toBe(1);
    expect(cycle.aggregateVersion).toBe(2);
    
    let events = cycle.getUncommittedEvents();
    expect(events[0].eventType).toBe('WorkerObjectiveAddedEvent');
    
    cycle.clearUncommittedEvents();
    
    cycle.addKeyResult('obj-1', 'kr-1', 'Fast', 10, 'deliveries');
    
    expect(cycle.objectives[0].keyResults.length).toBe(1);
    expect(cycle.objectives[0].keyResults[0].id).toBe('kr-1');
    expect(cycle.aggregateVersion).toBe(3);
    
    events = cycle.getUncommittedEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe('KeyResultAddedEvent');
    
    cycle.clearUncommittedEvents();

    cycle.updateKeyResultProgress('obj-1', 'kr-1', 5);
    expect(cycle.objectives[0].keyResults[0].currentValue).toBe(5);
    expect(cycle.aggregateVersion).toBe(4);
    
    events = cycle.getUncommittedEvents();
    expect(events[0].eventType).toBe('KeyResultProgressUpdatedEvent');
  });

  it('should throw when adding key result to non-existent objective', () => {
    const cycle = WorkerPerformanceCycle.start('cycle-1', 'worker-1', 'cycle-id-1', 'mem-1');
    expect(() => cycle.addKeyResult('non-existent', 'kr-1', 'Title', 10, 'unit')).toThrow('Objective not found');
  });

  it('should throw when adding key result to closed cycle', () => {
    const cycle = WorkerPerformanceCycle.start('cycle-1', 'worker-1', 'cycle-id-1', 'mem-1');
    cycle.close();
    expect(() => cycle.addKeyResult('obj-1', 'kr-1', 'Title', 10, 'unit')).toThrow('WorkerPerformanceCycle is closed');
  });

  it('should transition to MANAGER_REVIEW on evaluation submission', () => {
    const cycle = WorkerPerformanceCycle.start('cycle-1', 'worker-1', 'cycle-id-1', 'mem-1');
    cycle.submitManagerEvaluation('eval-1', 'mgr-1', 'MEETS_EXPECTATIONS', 'encrypted-text');
    
    expect(cycle.status).toBe('MANAGER_REVIEW');
    expect(cycle.evaluations.length).toBe(1);
    expect(cycle.evaluations[0].rating).toBe('MEETS_EXPECTATIONS');
  });

  it('should fail evaluation submission if closed', () => {
    const cycle = WorkerPerformanceCycle.start('cycle-1', 'worker-1', 'cycle-id-1', 'mem-1');
    const adherence = AdherenceSnapshot.create(100, 'v1', new Date('2026-01-01'), new Date('2026-01-31'), new Date(), 'CALCULATED');
    cycle.score(100, 'OUTSTANDING', 100, adherence, {});
    
    expect(() => cycle.submitManagerEvaluation('eval-1', 'mgr-1', 'MEETS_EXPECTATIONS', null))
      .toThrow('WorkerPerformanceCycle is closed or locked and cannot be modified');
  });

  it('should support calibration', () => {
    const cycle = WorkerPerformanceCycle.start('cycle-1', 'worker-1', 'cycle-id-1', 'mem-1');
    cycle.submitManagerEvaluation('eval-1', 'mgr-1', 'NEEDS_IMPROVEMENT', null);
    
    cycle.calibrate('MEETS_EXPECTATIONS', 'HR Adjustment');
    expect(cycle.status).toBe('CALIBRATING');
    expect(cycle.finalRating).toBe('MEETS_EXPECTATIONS');
  });

  it('should calculate and score, entering CLOSED state', () => {
    const cycle = WorkerPerformanceCycle.start('cycle-1', 'worker-1', 'cycle-id-1', 'mem-1');
    const adherence = AdherenceSnapshot.create(90, 'v1', new Date('2026-01-01'), new Date('2026-01-31'), new Date(), 'CALCULATED');
    
    cycle.clearUncommittedEvents();
    cycle.score(85, 'MEETS_EXPECTATIONS', 80, adherence, { okrWeight: 0.5, adherenceWeight: 0.5 });
    
    expect(cycle.status).toBe('CLOSED');
    expect(cycle.finalScore).toBe(85);
    expect(cycle.finalRating).toBe('MEETS_EXPECTATIONS');
    
    const events = cycle.getUncommittedEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe('WorkerPerformanceCycleScoredEvent');
    
    const scoredEvent = events[0] as any;
    expect(scoredEvent.payload.adherenceScore).toBe(90);
    expect(scoredEvent.payload.finalScore).toBe(85);
  });

  it('ACTIVE -> CLOSED succeeds via manual close', () => {
    const cycle = WorkerPerformanceCycle.start('cycle-1', 'worker-1', 'cycle-id-1', 'mem-1');
    cycle.clearUncommittedEvents();

    cycle.close('Manual closure');
    
    expect(cycle.status).toBe('CLOSED');
    expect(cycle.aggregateVersion).toBe(2);
    
    const events = cycle.getUncommittedEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe('WorkerPerformanceCycleClosedEvent');
    expect((events[0] as any).payload.reason).toBe('Manual closure');
  });

  it('invalid close transition fails', () => {
    const cycle = WorkerPerformanceCycle.start('cycle-1', 'worker-1', 'cycle-id-1', 'mem-1');
    cycle.close('first');
    
    expect(() => cycle.close('second')).toThrow('WorkerPerformanceCycle is closed or locked and cannot be modified');
  });

  it('CLOSED -> ACTIVE succeeds via reopen', () => {
    const cycle = WorkerPerformanceCycle.start('cycle-1', 'worker-1', 'cycle-id-1', 'mem-1');
    const adherence = AdherenceSnapshot.create(90, 'v1', new Date('2026-01-01'), new Date('2026-01-31'), new Date(), 'CALCULATED');
    cycle.score(85, 'MEETS_EXPECTATIONS', 80, adherence, {});
    
    cycle.clearUncommittedEvents();
    const versionBefore = cycle.aggregateVersion;

    cycle.reopen('Need rescore');
    
    expect(cycle.status).toBe('ACTIVE');
    expect(cycle.finalScore).toBeNull();
    expect(cycle.finalRating).toBeNull();
    expect(cycle.aggregateVersion).toBe(versionBefore + 1);

    const events = cycle.getUncommittedEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe('WorkerPerformanceCycleReopenedEvent');
    expect((events[0] as any).payload.reason).toBe('Need rescore');
    expect(events[0].aggregateId).toBe('cycle-1');
    expect(events[0].aggregateVersion).toBe(cycle.aggregateVersion);
  });

  it('invalid reopen transition fails', () => {
    const cycle = WorkerPerformanceCycle.start('cycle-1', 'worker-1', 'cycle-id-1', 'mem-1');
    expect(() => cycle.reopen()).toThrow('WorkerPerformanceCycle is not closed and cannot be reopened');
  });

  it('CLOSED state cannot be modified through normal lifecycle operations', () => {
    const cycle = WorkerPerformanceCycle.start('cycle-1', 'worker-1', 'cycle-id-1', 'mem-1');
    cycle.close();

    expect(() => cycle.addObjective('obj-2', 't', null, 1)).toThrow('WorkerPerformanceCycle is closed');
    expect(() => cycle.submitManagerEvaluation('e', 'm', 'OUTSTANDING', null)).toThrow('WorkerPerformanceCycle is closed');
  });
});
