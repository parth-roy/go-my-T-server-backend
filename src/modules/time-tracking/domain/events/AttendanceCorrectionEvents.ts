import { EvidenceReference } from '../value-objects/EvidenceReference';

export enum CorrectionRequestState {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
  CANCELLED = 'CANCELLED',
  PROCESSED = 'PROCESSED'
}

export enum CorrectionType {
  MISSED_PUNCH_IN = 'MISSED_PUNCH_IN',
  MISSED_PUNCH_OUT = 'MISSED_PUNCH_OUT',
  EDIT_PUNCH_TIME = 'EDIT_PUNCH_TIME',
  DELETE_PUNCH = 'DELETE_PUNCH'
}

export interface CorrectionSubmittedEvent {
  eventId: string;
  aggregateId: string;
  eventType: 'CorrectionSubmitted';
  payload: {
    workerId: string;
    organizationId: string;
    targetDate: Date;
    type: CorrectionType;
    revisionNumber: number;
    proposedChanges: Record<string, any>;
    reason: string;
    evidence: EvidenceReference[];
    policySnapshot: Record<string, any>;
  };
  recordedAt: Date;
}

export interface CorrectionApprovedEvent {
  eventId: string;
  aggregateId: string; // The workflow ID
  eventType: 'CorrectionApproved';
  payload: {
    referenceAggregateId: string; // The correction request ID
    workflowId: string;
    approverId?: string;
    comments?: string;
    approvalLevel: number;
  };
  recordedAt: Date;
}

export interface CorrectionRejectedEvent {
  eventId: string;
  aggregateId: string;
  eventType: 'CorrectionRejected';
  payload: {
    referenceAggregateId: string;
    workflowId: string;
    rejectorId?: string;
    comments?: string;
  };
  recordedAt: Date;
}

export interface CorrectionCancelledEvent {
  eventId: string;
  aggregateId: string;
  eventType: 'CorrectionCancelled';
  payload: {
    reason: string;
    revisionNumber: number;
  };
  recordedAt: Date;
}

export interface AttendanceCorrectionAppliedEvent {
  eventId: string;
  aggregateId: string;
  eventType: 'AttendanceCorrectionApplied';
  payload: {
    correctionRequestId: string;
    workerId: string;
    targetDate: Date;
    appliedChanges: Record<string, any>;
  };
  recordedAt: Date;
}

export interface TimesheetRecalculationRequestedEvent {
  eventId: string;
  aggregateId: string;
  eventType: 'TimesheetRecalculationRequested';
  payload: {
    workerId: string;
    targetDate: Date;
    reason: string;
    correctionRequestId: string;
  };
  recordedAt: Date;
}
