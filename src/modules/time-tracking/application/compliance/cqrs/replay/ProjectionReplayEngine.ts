import { BaseProjector, ProjectionContext } from '../projectors/BaseProjector';

export interface EventStoreRepository {
  /**
   * Fetches all events ordered by sequence/timestamp across all aggregates.
   */
  fetchAllEventsInOrder(): AsyncIterableIterator<any>;
}

export interface ProjectionStore {
  /**
   * Truncates a specific projection table completely.
   */
  truncateProjection(projectorName: string): Promise<void>;
  
  /**
   * Clears the checkpoint for a specific projection.
   */
  clearCheckpoint(projectorName: string): Promise<void>;
  
  /**
   * Provides a transaction boundary for applying a batch of events.
   */
  withTransaction(callback: (tx: any) => Promise<void>): Promise<void>;
}

export class ProjectionReplayEngine {
  constructor(
    private eventStore: EventStoreRepository,
    private projectionStore: ProjectionStore,
    private projectors: BaseProjector[]
  ) {}

  /**
   * Deterministically rebuilds all projections from the beginning of time.
   */
  public async rebuildAllProjections(): Promise<void> {
    // 1. Prepare phase: Truncate tables and checkpoints
    for (const projector of this.projectors) {
      await this.projectionStore.truncateProjection(projector.projectorName);
      await this.projectionStore.clearCheckpoint(projector.projectorName);
    }

    // 2. Replay phase: Fetch and sequentially apply all events
    const eventStream = this.eventStore.fetchAllEventsInOrder();
    
    for await (const event of eventStream) {
      // Execute each event projection inside an isolated transaction
      await this.projectionStore.withTransaction(async (tx) => {
        const context: ProjectionContext = { tx };
        
        // Feed the event to all registered projectors
        for (const projector of this.projectors) {
          await projector.project(event, context);
        }
      });
    }
  }

  /**
   * Deterministically rebuilds a single projection.
   */
  public async rebuildSingleProjection(projectorName: string): Promise<void> {
    const projector = this.projectors.find(p => p.projectorName === projectorName);
    if (!projector) {
      throw new Error(`Projector ${projectorName} not found.`);
    }

    await this.projectionStore.truncateProjection(projector.projectorName);
    await this.projectionStore.clearCheckpoint(projector.projectorName);

    const eventStream = this.eventStore.fetchAllEventsInOrder();
    for await (const event of eventStream) {
      await this.projectionStore.withTransaction(async (tx) => {
        await projector.project(event, { tx });
      });
    }
  }
}
