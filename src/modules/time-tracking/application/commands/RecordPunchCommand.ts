import { WorkContextType } from '../../domain/value-objects/WorkContext';
import { VerificationMethod } from '../../domain/value-objects/VerifiedIdentity';
import { AttendanceEventType } from '../../domain/events/WorkerAttendanceEvent';

export interface RecordPunchCommand {
  commandId: string;
  correlationId: string;
  causationId: string;
  workerId: string;
  organizationId: string;
  eventType: AttendanceEventType;
  recordedAt: string; // ISO string
  deviceTime: string; // ISO string
  source: string;
  workContext: {
    contextType: WorkContextType;
    contextId: string;
  };
  verification: {
    method: VerificationMethod;
    result: {
      status: 'VERIFIED' | 'FAILED' | 'MANUAL_REVIEW';
      confidenceScore: number;
    };
    location?: {
      latitude: number;
      longitude: number;
      accuracy: number;
      spoofingDetected: boolean;
    };
    device?: {
      deviceId: string;
      platform: string;
      appVersion: string;
    };
  };
}
