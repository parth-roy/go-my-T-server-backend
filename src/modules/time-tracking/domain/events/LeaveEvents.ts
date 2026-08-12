export interface EnterpriseEventHeader {
  eventVersion: string;
  schemaVersion: string;
  aggregateVersion: string;
  policyVersion: string;
  correlationId: string;
  causationId: string;
  recordedAt: Date;
}

export interface LeaveRequestSubmittedEvent extends EnterpriseEventHeader {
  eventType: 'LeaveRequestSubmitted';
  aggregateId: string; // LeaveRequestId
  payload: {
    workerId: string;
    leaveTypeId: string;
    startDate: Date;
    endDate: Date;
  };
}

export interface LeaveApprovedEvent extends EnterpriseEventHeader {
  eventType: 'LeaveApproved';
  aggregateId: string;
  payload: {
    workerId: string;
    leaveTypeId: string;
    approvedBy: string;
  };
}

export interface LeaveCancelledEvent extends EnterpriseEventHeader {
  eventType: 'LeaveCancelled';
  aggregateId: string;
  payload: {
    workerId: string;
    leaveTypeId: string;
  };
}

export interface LeaveBalanceAccruedEvent extends EnterpriseEventHeader {
  eventType: 'LeaveBalanceAccrued';
  aggregateId: string; // LedgerId
  payload: {
    workerId: string;
    leaveTypeId: string;
    amount: number;
    balanceAfter: number;
  };
}

export interface LeaveBalanceDeductedEvent extends EnterpriseEventHeader {
  eventType: 'LeaveBalanceDeducted';
  aggregateId: string; // LedgerId
  payload: {
    workerId: string;
    leaveTypeId: string;
    amount: number;
    balanceAfter: number;
  };
}

export interface LeaveBalanceRefundedEvent extends EnterpriseEventHeader {
  eventType: 'LeaveBalanceRefunded';
  aggregateId: string;
  payload: {
    workerId: string;
    leaveTypeId: string;
    amount: number;
    balanceAfter: number;
  };
}
