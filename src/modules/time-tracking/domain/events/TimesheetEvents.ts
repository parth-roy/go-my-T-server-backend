export interface TimesheetEvent {
  eventId: string;
  aggregateId: string; // Timesheet ID
  eventType: string;
  eventVersion: string;
  recordedAt: Date;
}

export interface TimesheetDraftCreatedEvent extends TimesheetEvent {
  eventType: 'TimesheetDraftCreated';
  payload: {
    workerId: string;
    payPeriodId: string;
  };
}

export interface TimesheetRecalculatedEvent extends TimesheetEvent {
  eventType: 'TimesheetRecalculated';
  payload: {
    workerId: string;
    payPeriodId: string;
    calculationVersion: string;
    aggregateVersion: string;
    blocks: Record<string, number>;
    snapshots: any;
    auditTrail: any;
    revisionNumber: number;
  };
}

export interface TimesheetApprovedEvent extends TimesheetEvent {
  eventType: 'TimesheetApproved';
  payload: {
    workerId: string;
    payPeriodId: string;
    approvedBy: string;
  };
}

export interface TimesheetPayrollLockedEvent extends TimesheetEvent {
  eventType: 'TimesheetPayrollLocked';
  payload: {
    workerId: string;
    payPeriodId: string;
    lockedBy: string;
  };
}

export interface TimesheetReadyForExportEvent extends TimesheetEvent {
  eventType: 'TimesheetReadyForExport';
  payload: {
    workerId: string;
    payPeriodId: string;
  };
}
