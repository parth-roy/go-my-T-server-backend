import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectionReplayEngine, EventStoreRepository, ProjectionStore } from '../replay/ProjectionReplayEngine';
import { BaseProjector, ProjectionContext } from '../projectors/BaseProjector';

class MockProjector extends BaseProjector {
  public handledEvents: any[] = [];
  public version = 0;
  
  constructor(name: string) { super(name); }

  protected async handleEvent(event: any, context: ProjectionContext): Promise<void> { this.handledEvents.push(event); }
  protected async isEventProcessed(): Promise<boolean> { return false; }
  protected async getCurrentAggregateVersion(): Promise<number> { return this.version; }
  protected async updateCheckpoint(event: any): Promise<void> { this.version = event.eventVersion; }
}

describe('ProjectionReplayEngine', () => {
  let eventStore: any;
  let projectionStore: any;
  let projectorA: MockProjector;
  let projectorB: MockProjector;
  let engine: ProjectionReplayEngine;

  beforeEach(() => {
    eventStore = {
      fetchAllEventsInOrder: vi.fn()
    };
    
    projectionStore = {
      truncateProjection: vi.fn(),
      clearCheckpoint: vi.fn(),
      withTransaction: vi.fn(async (cb) => {
        await cb('mock-tx');
      })
    };

    projectorA = new MockProjector('ProjectorA');
    projectorB = new MockProjector('ProjectorB');

    engine = new ProjectionReplayEngine(eventStore, projectionStore, [projectorA, projectorB]);
  });

  it('should rebuild all projections successfully from zero', async () => {
    const mockEvents = [
      { eventId: 'e-1', aggregateId: 'a-1', eventVersion: 1 },
      { eventId: 'e-2', aggregateId: 'a-1', eventVersion: 2 }
    ];

    eventStore.fetchAllEventsInOrder.mockReturnValue((async function* () {
      for (const e of mockEvents) yield e;
    })());

    await engine.rebuildAllProjections();

    expect(projectionStore.truncateProjection).toHaveBeenCalledWith('ProjectorA');
    expect(projectionStore.truncateProjection).toHaveBeenCalledWith('ProjectorB');
    expect(projectionStore.clearCheckpoint).toHaveBeenCalledWith('ProjectorA');
    expect(projectionStore.clearCheckpoint).toHaveBeenCalledWith('ProjectorB');

    expect(projectorA.handledEvents.length).toBe(2);
    expect(projectorB.handledEvents.length).toBe(2);
  });

  it('should rebuild single projection', async () => {
    const mockEvents = [
      { eventId: 'e-1', aggregateId: 'a-1', eventVersion: 1 }
    ];

    eventStore.fetchAllEventsInOrder.mockReturnValue((async function* () {
      for (const e of mockEvents) yield e;
    })());

    await engine.rebuildSingleProjection('ProjectorA');

    expect(projectionStore.truncateProjection).toHaveBeenCalledWith('ProjectorA');
    expect(projectionStore.truncateProjection).not.toHaveBeenCalledWith('ProjectorB');
    expect(projectorA.handledEvents.length).toBe(1);
    expect(projectorB.handledEvents.length).toBe(0);
  });

  it('should throw error if single projector is not found', async () => {
    await expect(engine.rebuildSingleProjection('UnknownProjector')).rejects.toThrow('Projector UnknownProjector not found.');
  });
});
