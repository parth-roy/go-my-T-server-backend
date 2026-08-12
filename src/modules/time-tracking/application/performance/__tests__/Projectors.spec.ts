import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkerPerformanceDashboardProjector } from '../../../infrastructure/projectors/performance/WorkerPerformanceDashboardProjector';

const mockPrisma = {
  workerPerformanceDashboard: {
    upsert: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn()
  },
  projectionCheckpoint: {
    findUnique: vi.fn(),
    upsert: vi.fn()
  }
} as any;

const mockContext = { tx: mockPrisma };

describe('WorkerPerformanceDashboardProjector', () => {
  let projector: WorkerPerformanceDashboardProjector;

  beforeEach(() => {
    vi.clearAllMocks();
    projector = new WorkerPerformanceDashboardProjector(mockPrisma);
    mockPrisma.projectionCheckpoint.findUnique.mockResolvedValue(null);
  });

  it('should create dashboard on WorkerPerformanceCycleStartedEvent', async () => {
    const event = {
      eventId: 'evt-1',
      aggregateId: 'worker-1',
      eventVersion: 1,
      eventType: 'WorkerPerformanceCycleStartedEvent',
      payload: { cycleId: 'cycle-1', workerId: 'worker-1' }
    };
    await projector.project(event, mockContext);
    expect(mockPrisma.workerPerformanceDashboard.upsert).toHaveBeenCalledWith({
      where: { workerId_cycleId: { workerId: 'worker-1', cycleId: 'cycle-1' } },
      create: expect.objectContaining({ status: 'ACTIVE' }),
      update: { status: 'ACTIVE' }
    });
    expect(mockPrisma.projectionCheckpoint.upsert).toHaveBeenCalledTimes(2);
  });

  it('should ignore duplicate events', async () => {
    mockPrisma.projectionCheckpoint.findUnique.mockResolvedValueOnce({ lastEventId: 'evt-1' });
    const event = {
      eventId: 'evt-1',
      aggregateId: 'worker-1',
      eventVersion: 1,
      eventType: 'WorkerPerformanceCycleStartedEvent',
      payload: { cycleId: 'cycle-1', workerId: 'worker-1' }
    };
    await projector.project(event, mockContext);
    expect(mockPrisma.workerPerformanceDashboard.upsert).not.toHaveBeenCalled();
  });
  
  it('should throw on version gap', async () => {
    mockPrisma.projectionCheckpoint.findUnique
      .mockResolvedValueOnce(null) // isEventProcessed
      .mockResolvedValueOnce({ lastEventId: '1' }); // getCurrentAggregateVersion returns 1
      
    const event = {
      eventId: 'evt-2',
      aggregateId: 'worker-1',
      eventVersion: 3, // gap! expected 2
      eventType: 'WorkerObjectiveAddedEvent',
      payload: {}
    };
    await expect(projector.project(event, mockContext)).rejects.toThrow('Version mismatch');
  });
});
