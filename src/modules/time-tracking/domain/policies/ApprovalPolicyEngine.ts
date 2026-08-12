import { ApprovalPolicy, ApprovalRule } from '../aggregates/ApprovalWorkflow';
import { CorrectionType } from '../events/AttendanceCorrectionEvents';

export class ApprovalPolicyEngine {
  
  public static getPolicyForCorrection(
    correctionType: CorrectionType,
    missingMinutes: number,
    orgId: string
  ): ApprovalPolicy {
    // In a real system, this would look up org-specific configurations.
    // We mock the enterprise rules here based on the constraints.

    if (missingMinutes <= 5 && correctionType === CorrectionType.EDIT_PUNCH_TIME) {
      // Auto-approve minor edits
      const autoRule: ApprovalRule = { level: 1, role: 'SYSTEM', autoApprove: true };
      return new ApprovalPolicy([autoRule], 'NONE');
    }

    if (correctionType === CorrectionType.MISSED_PUNCH_IN || correctionType === CorrectionType.MISSED_PUNCH_OUT) {
      // Missing punches require L1 (Supervisor) and L2 (Manager) if > 8 hours
      const rules: ApprovalRule[] = [{ level: 1, role: 'SUPERVISOR', autoApprove: false }];
      
      if (missingMinutes > 480) { // 8 hours
        rules.push({ level: 2, role: 'MANAGER', autoApprove: false });
      }

      return new ApprovalPolicy(rules, 'L2_MANAGER_ESCALATION');
    }

    // Default: Require L1
    return new ApprovalPolicy([{ level: 1, role: 'SUPERVISOR', autoApprove: false }], 'L1_MANAGER_ESCALATION');
  }
}
