import { PrismaClient } from '@prisma/client';
import { IWorkerAttendanceEventStore, ITimeTrackingOutbox, ICommandInbox } from '../../application/commands/RecordPunchCommandHandler';
import { WorkerAttendanceEvent } from '../../domain/events/WorkerAttendanceEvent';

export class PrismaTimeTrackingRepository implements IWorkerAttendanceEventStore, ITimeTrackingOutbox, ICommandInbox {
  constructor(private readonly prisma: PrismaClient) {}

  public async hasProcessed(commandId: string, handlerName: string): Promise<boolean> {
    const record = await this.prisma.commandInbox.findUnique({
      where: { commandId }
    });
    return record !== null && record.handlerName === handlerName;
  }

  public async markProcessed(commandId: string, handlerName: string): Promise<void> {
    // Upsert to handle concurrent identical requests gracefully if not caught early
    await this.prisma.commandInbox.upsert({
      where: { commandId },
      create: { commandId, handlerName },
      update: { handlerName }
    });
  }

  public async append(event: WorkerAttendanceEvent): Promise<void> {
    await this.prisma.workerAttendanceEvent.create({
      data: {
        eventId: event.eventId,
        aggregateId: event.aggregateId,
        eventVersion: event.eventVersion,
        schemaVersion: event.schemaVersion,
        commandId: event.commandId,
        correlationId: event.correlationId,
        causationId: event.causationId,
        workerId: event.workerId,
        organizationId: event.organizationId,
        eventType: event.eventType,
        recordedAt: event.recordedAt,
        deviceTime: event.deviceTime,
        serverTime: event.serverTime,
        source: event.source,
        workContext: event.workContext.toJSON() as any,
        verification: event.verification.toJSON() as any
      }
    });
  }

  public async publish(event: WorkerAttendanceEvent): Promise<void> {
    // Transactional outbox pattern implementation
    // This writes to the outbox table. A background worker (e.g. BullMQ or Debezium CDC)
    // will read this and publish to Kafka / Message Bus.
    await this.prisma.timeTrackingOutbox.create({
      data: {
        eventId: event.eventId,
        eventType: event.eventType,
        payload: event.toJSON() as any,
        published: false
      }
    });
  }

  /**
   * Helper to run commands in a transactional boundary to ensure atomicity
   * of the inbox check, event store append, and outbox publish.
   */
  public async executeTransactionally(
    commandId: string,
    handlerName: string,
    callback: (txRepo: PrismaTimeTrackingRepository) => Promise<void>
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const txRepo = new PrismaTimeTrackingRepository(tx as PrismaClient);
      
      const processed = await txRepo.hasProcessed(commandId, handlerName);
      if (processed) {
        return; // Idempotent bail-out
      }

      await callback(txRepo);
      await txRepo.markProcessed(commandId, handlerName);
    });
  }
}
