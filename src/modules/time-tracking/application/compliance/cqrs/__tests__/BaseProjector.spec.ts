import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseProjector, ProjectionContext } from '../projectors/BaseProjector';

class TestProjector extends BaseProjector {
  public handledEvents: any[] = [];
  public currentVersion = 0;
  public processedEvents = new Set<string>();

  constructor() {
    super('TestProjector');
  }

  protected async handleEvent(event: any, context: ProjectionContext): Promise<void> {
    this.handledEvents.push(event);
  }

  protected async isEventProcessed(eventId: string, context: ProjectionContext): Promise<boolean> {
    return this.processedEvents.has(eventId);
  }

  protected async getCurrentAggregateVersion(aggregateId: string, context: ProjectionContext): Promise<number> {
    return this.currentVersion;
  }

  protected async updateCheckpoint(event: any, context: ProjectionContext): Promise<void> {
    this.processedEvents.add(event.eventId);
    this.currentVersion = event.eventVersion;
  }
}

describe('BaseProjector', () => {
  let projector: TestProjector;
  let context: ProjectionContext;

  beforeEach(() => {
    projector = new TestProjector();
    context = { tx: {} };
  });

  it('should project a valid event successfully', async () => {
    const event = { eventId: 'e-1', aggregateId: 'a-1', eventVersion: 1 };
    await projector.project(event, context);
    expect(projector.handledEvents.length).toBe(1);
    expect(projector.handledEvents[0].eventId).toBe('e-1');
    expect(projector.currentVersion).toBe(1);
    expect(projector.processedEvents.has('e-1')).toBe(true);
  });

  it('should ignore duplicate events idempotently', async () => {
    const event = { eventId: 'e-1', aggregateId: 'a-1', eventVersion: 1 };
    await projector.project(event, context);
    await projector.project(event, context); // Duplicate
    
    expect(projector.handledEvents.length).toBe(1); // Only handled once
  });

  it('should reject out-of-order events (future version)', async () => {
    const event = { eventId: 'e-1', aggregateId: 'a-1', eventVersion: 2 };
    // currentVersion is 0, so eventVersion 2 is a missing sequence gap
    await expect(projector.project(event, context)).rejects.toThrowError('[TestProjector] Version mismatch for aggregate a-1. Expected 1, got 2.');
  });

  it('should ignore older events idempotently', async () => {
    projector.currentVersion = 5;
    const event = { eventId: 'e-1', aggregateId: 'a-1', eventVersion: 3 }; // Older version
    await projector.project(event, context);
    
    expect(projector.handledEvents.length).toBe(0); // Ignored
  });
});
