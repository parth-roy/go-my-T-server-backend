import { describe, it, expect } from 'vitest';
import { RegulatoryRuleEngine } from '../services/RegulatoryRuleEngine';
import { WorkerCompliance, WorkerComplianceStatus } from '../WorkerCompliance.aggregate';
import { PolicySnapshot } from '../value-objects/PolicySnapshot.vo';

describe('RegulatoryRuleEngine', () => {
  it('should evaluate compliance based on rules', () => {
    const compliance = new WorkerCompliance('w-1', 'w-1', 'org-1', WorkerComplianceStatus.PENDING_VERIFICATION, PolicySnapshot.create({}), 1, new Date(), new Date());
    const engine = new RegulatoryRuleEngine();
    
    // Test abstract compliance checks
    engine.registerRule('strict-rule', (comp) => false);
    const isCompliant = engine.evaluateAll(compliance);
    expect(isCompliant).toBe(false);
  });

  it('should return true if rules pass', () => {
    const compliance = new WorkerCompliance('w-1', 'w-1', 'org-1', WorkerComplianceStatus.PENDING_VERIFICATION, PolicySnapshot.create({}), 1, new Date(), new Date());
    const engine = new RegulatoryRuleEngine();
    engine.registerRule('pass-rule', (comp) => true);
    expect(engine.evaluateAll(compliance)).toBe(true);
  });
});
