export interface SubmitLeaveCommand {
  workerId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  reason: string;
}

export interface AccrueLeaveCommand {
  workerId: string;
  leaveTypeId: string;
  amount: number;
}

export interface CreditCompOffCommand {
  workerId: string;
  amount: number;
  expiryDate: Date;
}
