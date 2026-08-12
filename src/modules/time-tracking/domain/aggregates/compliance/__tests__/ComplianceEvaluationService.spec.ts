import { describe, it, expect } from 'vitest';
import { ComplianceEvaluationService } from '../services/ComplianceEvaluationService';
import { RegulatoryRuleEngine } from '../services/RegulatoryRuleEngine';
import { WorkerCompliance, WorkerComplianceStatus } from '../WorkerCompliance.aggregate';
import { PolicySnapshot } from '../value-objects/PolicySnapshot.vo';

describe('ComplianceEvaluationService', () => {
  it('should evaluate overall compliance state (non-compliant)', () => {
    const compliance = new WorkerCompliance('w-1', 'w-1', 'org-1', WorkerComplianceStatus.PENDING_VERIFICATION, PolicySnapshot.create({}), 1, new Date(), new Date());
    const engine = new RegulatoryRuleEngine();
    engine.registerRule('strict-rule', () => false);
    const service = new ComplianceEvaluationService(engine);
    
    expect(service.evaluate(compliance)).toBe(WorkerComplianceStatus.NON_COMPLIANT);
  });

  it('should evaluate overall compliance state (compliant)', () => {
    const compliance = new WorkerCompliance('w-1', 'w-1', 'org-1', WorkerComplianceStatus.PENDING_VERIFICATION, PolicySnapshot.create({}), 1, new Date(), new Date());
    const engine = new RegulatoryRuleEngine();
    engine.registerRule('pass-rule', () => true);
    const service = new ComplianceEvaluationService(engine);
    
    expect(service.evaluate(compliance)).toBe(WorkerComplianceStatus.COMPLIANT);
  });
});
