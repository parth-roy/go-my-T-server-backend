export interface ProjectionCheckpoint {
  projectionName: string;
  lastEventId: string;
  lastEventVersion: number;
  updatedAt: Date;
}

export interface ProjectionContext {
  tx: any; // Transaction boundary
}

export abstract class BaseProjector {
  constructor(public readonly projectorName: string) {}

  public async project(event: any, context: ProjectionContext): Promise<void> {
    const isProcessed = await this.isEventProcessed(event.eventId, context);
    if (isProcessed) {
      // Idempotency: Ignore duplicate event
      return;
    }

    const currentVersion = await this.getCurrentAggregateVersion(event.aggregateId, context);
    if (event.eventVersion <= currentVersion) {
      // Idempotency / Ordering protection: Ignore older versions if already processed
      return;
    }

    if (event.eventVersion > currentVersion + 1) {
      throw new Error(`[${this.projectorName}] Version mismatch for aggregate ${event.aggregateId}. Expected ${currentVersion + 1}, got ${event.eventVersion}.`);
    }

    await this.handleEvent(event, context);
    await this.updateCheckpoint(event, context);
  }

  protected abstract handleEvent(event: any, context: ProjectionContext): Promise<void>;

  protected abstract isEventProcessed(eventId: string, context: ProjectionContext): Promise<boolean>;
  
  protected abstract getCurrentAggregateVersion(aggregateId: string, context: ProjectionContext): Promise<number>;

  protected abstract updateCheckpoint(event: any, context: ProjectionContext): Promise<void>;
}
