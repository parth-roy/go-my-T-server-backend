import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SuspensionCascadingSaga } from '../SuspensionCascadingSaga';
import { SagaState } from '../BaseSaga';

describe('SuspensionCascadingSaga', () => {
  let repository: any;
  let bus: any;
  let saga: SuspensionCascadingSaga;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      save: vi.fn(),
      beginTransaction: vi.fn().mockResolvedValue('tx-1'),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn()
    };
    bus = {
      publish: vi.fn()
    };
    saga = new SuspensionCascadingSaga(repository, bus);
  });

  it('should handle WorkerComplianceStatusChangedEvent (Suspension) and broadcast integration events', async () => {
    repository.findById.mockResolvedValue(null);
    const event = {
      eventId: 'evt-1',
      aggregateId: 'w-1',
      newStatus: 'NON_COMPLIANT',
      reason: 'Expired Credential'
    };

    await saga.handleWorkerComplianceSuspended(event);

    expect(repository.save).toHaveBeenCalled();
    const publishedEvent = bus.publish.mock.calls[0][0];
    expect(publishedEvent.payload.workerId).toBe('w-1');
    expect(publishedEvent.eventType).toBe('WorkerComplianceSuspendedIntegrationEvent');
    expect(bus.publish).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'WorkerComplianceSuspendedIntegrationEvent'
    }), expect.anything());
  });

  it('should not update context data if already processing', async () => {
    repository.findById.mockResolvedValue({
      state: SagaState.COMPLETED,
      step: 1,
      data: { workerId: 'w-2', reason: 'other' }
    });
    
    const event = {
      eventId: 'evt-2',
      correlationId: 'corr-2',
      causationId: 'cause-2',
      aggregateId: 'w-1',
      reason: 'Safety Violation'
    };
    
    await saga.handleWorkerComplianceSuspended(event);
    expect(bus.publish).not.toHaveBeenCalled();
  });

  it('should mark saga as completed immediately after broadcasting', async () => {
    repository.findById.mockResolvedValue(null);
    const event = {
      eventId: 'evt-2',
      aggregateId: 'w-2',
      newStatus: 'NON_COMPLIANT',
      reason: 'Missing Background Check'
    };

    await saga.handleWorkerComplianceSuspended(event);
    
    // Check state inside the saved context object
    const savedContext = repository.save.mock.calls[0][0];
    expect(savedContext.state).toBe(SagaState.COMPLETED);
  });
});
