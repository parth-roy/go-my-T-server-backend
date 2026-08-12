export interface RecalculateWorkerTimesheetCommand {
  workerId: string;
  payPeriodId: string;
  reason: string;
}

export interface RecalculateTimesheetCommand {
  timesheetId: string;
  reason: string;
}

export interface RecalculatePayPeriodCommand {
  payPeriodId: string;
  reason: string;
}

export interface RecalculateOrganizationCommand {
  organizationId: string;
  targetDate: string; // Recalculate active periods for this date
  reason: string;
}

export interface LockPayPeriodCommand {
  payPeriodId: string;
  lockedBy: string;
}

export interface ExportTimesheetCommand {
  timesheetId: string;
  requestedBy: string;
}
