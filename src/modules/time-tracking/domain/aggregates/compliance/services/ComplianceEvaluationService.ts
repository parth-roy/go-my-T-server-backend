import { WorkerCompliance, WorkerComplianceStatus } from '../WorkerCompliance.aggregate';
import { RegulatoryRuleEngine } from './RegulatoryRuleEngine';

export class ComplianceEvaluationService {
  constructor(private ruleEngine: RegulatoryRuleEngine) {}

  public evaluate(compliance: WorkerCompliance): WorkerComplianceStatus {
    const isCompliant = this.ruleEngine.evaluateAll(compliance);
    
    // In a full implementation, this service might inspect the details
    // to distinguish between NON_COMPLIANT and PENDING_VERIFICATION.
    
    if (isCompliant) {
      return WorkerComplianceStatus.COMPLIANT;
    }
    
    return WorkerComplianceStatus.NON_COMPLIANT;
  }
}
