import { PrismaClient } from '@prisma/client';
import { EventOutboxService } from '../../../application/compliance/services/WorkerComplianceApplicationService';
import { TestUnitOfWork } from './TestUnitOfWork';

export class TestPrismaEventOutboxService implements EventOutboxService {
  constructor(private prisma: PrismaClient) {}

  public async publish(events: ReadonlyArray<any>, tx: any): Promise<void> {
    const isUow = tx instanceof TestUnitOfWork;

    for (const event of events) {
      // Write to outbox table
      const outboxOp = this.prisma.timeTrackingOutbox.create({
        data: {
          eventId: event.eventId || crypto.randomUUID(),
          eventType: event.constructor.name,
          payload: JSON.parse(JSON.stringify(event)),
        }
      });
      
      // Write to event store
      const eventOp = this.prisma.complianceEvent.create({
        data: {
          eventId: event.eventId || crypto.randomUUID(),
          eventType: event.constructor.name,
          aggregateId: event.aggregateId || 'UNKNOWN',
          payload: JSON.parse(JSON.stringify(event)),
        }
      });
      
      if (isUow) {
        tx.add(outboxOp);
        tx.add(eventOp);
      } else {
        await this.prisma.$transaction([outboxOp, eventOp]);
      }
    }
  }
}
