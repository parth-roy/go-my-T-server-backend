import { WorkerCompliance } from '../WorkerCompliance.aggregate';
import { CredentialState } from '../state-machines/CredentialStateMachine';

export type ComplianceRule = (compliance: WorkerCompliance) => boolean;

export class RegulatoryRuleEngine {
  private rules: Map<string, ComplianceRule> = new Map();

  public registerRule(ruleId: string, rule: ComplianceRule): void {
    this.rules.set(ruleId, rule);
  }

  public evaluateAll(compliance: WorkerCompliance): boolean {
    for (const [ruleId, rule] of this.rules.entries()) {
      const passed = rule(compliance);
      if (!passed) {
        return false;
      }
    }
    return true;
  }
}
