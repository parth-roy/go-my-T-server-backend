import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentLifecycleSaga } from '../DocumentLifecycleSaga';
import { SagaState } from '../BaseSaga';

describe('DocumentLifecycleSaga', () => {
  let repository: any;
  let bus: any;
  let saga: DocumentLifecycleSaga;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      save: vi.fn(),
      beginTransaction: vi.fn().mockResolvedValue('tx-1'),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn()
    };
    bus = { publish: vi.fn(), send: vi.fn() };
    saga = new DocumentLifecycleSaga(repository, bus);
  });

  it('should handle WorkerCredentialRevokedEvent and trigger crypto shredding', async () => {
    repository.findById.mockResolvedValue(null);
    const event = {
      eventId: 'evt-1',
      aggregateId: 'w-1',
      credentialId: 'c-1',
      reason: 'Terminated'
    };

    await saga.handleCryptoShreddingRequested(event);

    expect(repository.save).toHaveBeenCalled();
    const publishedEvent = bus.publish.mock.calls[0][0];
    expect(publishedEvent.payload.documentId).toBe('c-1');
    expect(publishedEvent.eventType).toBe('CryptoShreddingTriggeredIntegrationEvent');

    const savedContext = repository.save.mock.calls[0][0];
    expect(savedContext.state).toBe(SagaState.COMPLETED);
  });

  it('should process document archive request', async () => {
    const event = {
      eventId: 'evt-2',
      correlationId: 'corr-2',
      causationId: 'cause-2',
      aggregateId: 'w-1',
      credentialId: 'c-1',
      occurredAt: new Date()
    };
    await saga.handleDocumentArchiveRequested(event);
    expect(bus.send).toHaveBeenCalledWith(expect.objectContaining({
      commandType: 'ArchiveDocumentCommand',
      payload: { documentId: 'c-1', workerId: 'w-1' }
    }), expect.anything());
  });

  it('should not update context data if already processing', async () => {
    repository.findById.mockResolvedValue({
      state: SagaState.COMPLETED,
      step: 1,
      data: { workerId: 'w-2', documentId: 'c-2' }
    });
    
    const event = {
      eventId: 'evt-3',
      correlationId: 'corr-3',
      causationId: 'cause-3',
      aggregateId: 'w-1',
      credentialId: 'c-1',
      occurredAt: new Date()
    };
    
    await saga.handleDocumentArchiveRequested(event);
    expect(bus.send).not.toHaveBeenCalled();
  });
});
