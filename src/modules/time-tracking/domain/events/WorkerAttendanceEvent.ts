import { WorkContext } from '../value-objects/WorkContext';
import { VerifiedIdentity } from '../value-objects/VerifiedIdentity';

export enum AttendanceEventType {
  CHECK_IN = 'WORKER_CHECKED_IN',
  CHECK_OUT = 'WORKER_CHECKED_OUT',
  BREAK_START = 'WORKER_ON_BREAK',
  BREAK_END = 'WORKER_OFF_BREAK',
  CORRECTION = 'ATTENDANCE_CORRECTED'
}

export abstract class DomainEvent {
  public readonly eventId: string;
  public readonly timestamp: Date;
  
  constructor(eventId?: string) {
    // Basic UUID generator stub for domain events
    this.eventId = eventId || crypto.randomUUID();
    this.timestamp = new Date();
  }
}

export class WorkerAttendanceEvent extends DomainEvent {
  constructor(
    eventId: string | undefined,
    public readonly aggregateId: string,
    public readonly eventVersion: string,
    public readonly schemaVersion: string,
    public readonly commandId: string,
    public readonly correlationId: string,
    public readonly causationId: string,
    public readonly workerId: string,
    public readonly organizationId: string,
    public readonly eventType: AttendanceEventType,
    public readonly recordedAt: Date,
    public readonly deviceTime: Date,
    public readonly serverTime: Date,
    public readonly source: string,
    public readonly workContext: WorkContext,
    public readonly verification: VerifiedIdentity
  ) {
    super(eventId);
  }

  public toJSON() {
    return {
      eventId: this.eventId,
      aggregateId: this.aggregateId,
      eventVersion: this.eventVersion,
      schemaVersion: this.schemaVersion,
      commandId: this.commandId,
      correlationId: this.correlationId,
      causationId: this.causationId,
      workerId: this.workerId,
      organizationId: this.organizationId,
      eventType: this.eventType,
      recordedAt: this.recordedAt.toISOString(),
      deviceTime: this.deviceTime.toISOString(),
      serverTime: this.serverTime.toISOString(),
      source: this.source,
      workContext: this.workContext.toJSON(),
      verification: this.verification.toJSON()
    };
  }
}
