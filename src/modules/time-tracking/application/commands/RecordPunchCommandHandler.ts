import { RecordPunchCommand } from './RecordPunchCommand';
import { WorkContext } from '../../domain/value-objects/WorkContext';
import { VerifiedIdentity } from '../../domain/value-objects/VerifiedIdentity';
import { WorkerAttendanceEvent } from '../../domain/events/WorkerAttendanceEvent';

// Interfaces for dependencies to respect Clean Architecture
export interface ICommandInbox {
  hasProcessed(commandId: string, handlerName: string): Promise<boolean>;
  markProcessed(commandId: string, handlerName: string): Promise<void>;
}

export interface IWorkerAttendanceEventStore {
  append(event: WorkerAttendanceEvent): Promise<void>;
}

export interface ITimeTrackingOutbox {
  publish(event: WorkerAttendanceEvent): Promise<void>;
}

export class RecordPunchCommandHandler {
  private readonly handlerName = 'RecordPunchCommandHandler';

  constructor(
    private readonly commandInbox: ICommandInbox,
    private readonly eventStore: IWorkerAttendanceEventStore,
    private readonly outbox: ITimeTrackingOutbox
  ) {}

  public async handle(command: RecordPunchCommand): Promise<void> {
    // 1. Idempotency Check
    const alreadyProcessed = await this.commandInbox.hasProcessed(command.commandId, this.handlerName);
    if (alreadyProcessed) {
      console.log(`[Idempotency] Command ${command.commandId} already processed by ${this.handlerName}. Skipping.`);
      return;
    }

    // 2. Reconstruct Value Objects
    const workContext = WorkContext.create(
      command.workContext.contextType,
      command.workContext.contextId
    );

    const verifiedIdentity = VerifiedIdentity.create(
      command.verification.method,
      command.verification.result,
      command.verification.location || null,
      command.verification.device || null
    );

    // 3. Construct Aggregate Stream ID
    // Example: WorkerId-YYYY-MM-DD
    const recordedDate = new Date(command.recordedAt);
    const dateString = recordedDate.toISOString().split('T')[0];
    const aggregateId = `${command.workerId}-${dateString}`;

    // 4. Create Domain Event
    const event = new WorkerAttendanceEvent(
      undefined, // auto-generate eventId
      aggregateId,
      '1.0',
      '1.0',
      command.commandId,
      command.correlationId,
      command.causationId,
      command.workerId,
      command.organizationId,
      command.eventType,
      recordedDate,
      new Date(command.deviceTime),
      new Date(), // serverTime
      command.source,
      workContext,
      verifiedIdentity
    );

    // 5. Transaction: Append to Event Store, Publish to Outbox, Mark Command Inbox
    // In a real implementation with Prisma, these would be executed inside a single transaction boundary
    // For this architecture illustration, we assume the infrastructure layer handles the transactional outbox pattern
    await this.eventStore.append(event);
    await this.outbox.publish(event);
    await this.commandInbox.markProcessed(command.commandId, this.handlerName);
  }
}
