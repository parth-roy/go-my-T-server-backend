import { describe, it, expect } from 'vitest';
import { PerformanceScoringPolicy } from '../PerformanceScoringPolicy.aggregate';

describe('PerformanceScoringPolicy Aggregate', () => {
  it('should initialize successfully', () => {
    const policy = PerformanceScoringPolicy.create(
      'id-1',
      'policy-1',
      '1.0',
      new Date(),
      0.7,
      0.3,
      []
    );

    expect(policy.status).toBe('DRAFT');
    expect(policy.okrWeight).toBe(0.7);
    expect(policy.adherenceWeight).toBe(0.3);
    
    const events = policy.getUncommittedEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe('PerformanceScoringPolicyCreatedEvent');
  });

  it('should throw error if weights do not sum to 1', () => {
    expect(() => {
      PerformanceScoringPolicy.create('id-1', 'policy-1', '1.0', new Date(), 0.8, 0.3, []);
    }).toThrow('okrWeight and adherenceWeight must sum to 1');
  });

  it('should throw error if weights are negative', () => {
    expect(() => {
      PerformanceScoringPolicy.create('id-1', 'policy-1', '1.0', new Date(), -0.1, 1.1, []);
    }).toThrow('okrWeight must be between 0 and 1');
  });

  it('should activate a DRAFT policy', () => {
    const policy = PerformanceScoringPolicy.create('id-1', 'policy-1', '1.0', new Date(), 0.6, 0.4, []);
    policy.clearUncommittedEvents();
    
    policy.activate();
    expect(policy.status).toBe('ACTIVE');
    expect(policy.aggregateVersion).toBe(2);

    const events = policy.getUncommittedEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe('PerformanceScoringPolicyActivatedEvent');
  });

  it('should prevent double activation', () => {
    const policy = PerformanceScoringPolicy.create('id-1', 'policy-1', '1.0', new Date(), 0.6, 0.4, []);
    policy.activate();
    
    expect(() => policy.activate()).toThrow('Only DRAFT policies can be activated');
  });

  it('ACTIVE -> ARCHIVED succeeds via archive', () => {
    const policy = PerformanceScoringPolicy.create('id-1', 'policy-1', '1.0', new Date(), 0.6, 0.4, []);
    policy.activate();
    policy.clearUncommittedEvents();
    
    policy.archive('deprecated');
    
    expect(policy.status).toBe('ARCHIVED');
    expect(policy.effectiveTo).toBeDefined();
    expect(policy.aggregateVersion).toBe(3);

    const events = policy.getUncommittedEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe('PerformanceScoringPolicyArchivedEvent');
    expect((events[0] as any).payload.reason).toBe('deprecated');
  });

  it('invalid archive transition fails', () => {
    const policy = PerformanceScoringPolicy.create('id-1', 'policy-1', '1.0', new Date(), 0.6, 0.4, []);
    
    // Cannot archive DRAFT
    expect(() => policy.archive()).toThrow('Only ACTIVE policies can be archived');
  });

  it('archived policy cannot be activated again', () => {
    const policy = PerformanceScoringPolicy.create('id-1', 'policy-1', '1.0', new Date(), 0.6, 0.4, []);
    policy.activate();
    policy.archive();
    
    // Status is ARCHIVED
    expect(() => policy.activate()).toThrow('Only DRAFT policies can be activated');
  });
});
