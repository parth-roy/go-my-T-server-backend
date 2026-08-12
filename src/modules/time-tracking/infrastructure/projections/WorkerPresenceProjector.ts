import { PrismaClient } from '@prisma/client';
import { WorkerAttendanceEvent, AttendanceEventType } from '../../domain/events/WorkerAttendanceEvent';

export class WorkerPresenceProjector {
  constructor(private readonly prisma: PrismaClient) {}

  public async project(event: WorkerAttendanceEvent): Promise<void> {
    const presenceStatus = this.mapEventToPresenceStatus(event.eventType);
    
    // Ignore events that don't affect presence status directly (e.g. CORRECTION)
    if (!presenceStatus) {
      return;
    }

    // Upsert WorkerPresence Projection
    // Ensure we only update if the incoming event is newer than the last seen
    // In a real CQRS system, event ordering guarantees or version checks are necessary.
    await this.prisma.workerPresence.upsert({
      where: {
        workerId: event.workerId
      },
      create: {
        workerId: event.workerId,
        organizationId: event.organizationId,
        status: presenceStatus,
        lastSeenAt: event.recordedAt,
        workContext: event.workContext.toJSON() as any,
        projectionVersion: "1.0"
      },
      update: {
        status: presenceStatus,
        lastSeenAt: event.recordedAt,
        workContext: event.workContext.toJSON() as any
      }
    });

    // Update Projection Checkpoint to track exactly where we are in the stream
    await this.prisma.projectionCheckpoint.upsert({
      where: { projectionName: 'WorkerPresenceProjector' },
      create: {
        projectionName: 'WorkerPresenceProjector',
        lastEventId: event.eventId
      },
      update: {
        lastEventId: event.eventId
      }
    });
  }

  private mapEventToPresenceStatus(eventType: AttendanceEventType): string | null {
    switch (eventType) {
      case AttendanceEventType.CHECK_IN:
      case AttendanceEventType.BREAK_END:
        return 'CLOCKED_IN';
      case AttendanceEventType.BREAK_START:
        return 'ON_BREAK';
      case AttendanceEventType.CHECK_OUT:
        return 'CLOCKED_OUT';
      case AttendanceEventType.CORRECTION:
      default:
        return null;
    }
  }
}
