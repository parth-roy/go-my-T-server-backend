export interface RequestCorrectionCommand {
  workerId: string;
  organizationId: string;
  targetDate: string;
  type: string;
  proposedChanges: Record<string, any>;
  reason: string;
  evidence: Array<{ type: string; url?: string; noteText?: string }>;
}

export interface ApproveCorrectionCommand {
  workflowId: string;
  approverId: string;
  comments?: string;
}

export interface RejectCorrectionCommand {
  workflowId: string;
  rejectorId: string;
  comments?: string;
}

export interface WithdrawCorrectionCommand {
  correctionRequestId: string;
}
