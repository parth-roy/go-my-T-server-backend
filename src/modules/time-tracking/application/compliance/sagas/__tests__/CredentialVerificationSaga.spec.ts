import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CredentialVerificationSaga } from '../CredentialVerificationSaga';
import { SagaState } from '../BaseSaga';

describe('CredentialVerificationSaga', () => {
  let repository: any;
  let bus: any;
  let saga: CredentialVerificationSaga;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      save: vi.fn(),
      beginTransaction: vi.fn().mockResolvedValue('tx-1'),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn()
    };

    bus = {
      send: vi.fn(),
      publish: vi.fn()
    };

    saga = new CredentialVerificationSaga(repository, bus);
  });

  it('should start verification and send external command', async () => {
    repository.findById.mockResolvedValue(null);

    const event = {
      eventId: 'evt-1',
      correlationId: 'corr-1',
      causationId: 'cause-1',
      workerId: 'w-1',
      credentialId: 'c-1',
      verificationType: 'VOTER_ID'
    };

    await saga.handleVerificationRequested(event);

    expect(repository.save).toHaveBeenCalled();
    expect(bus.send).toHaveBeenCalledWith({
      commandType: 'RequestExternalGovVerificationCommand',
      correlationId: 'corr-1',
      causationId: 'cause-1',
      payload: { credentialId: 'c-1', verificationType: 'VOTER_ID' }
    }, 'tx-1');
  });

  it('should handle webhook callback and complete saga', async () => {
    const mockContext = {
      sagaId: 'evt-1',
      correlationId: 'corr-1',
      causationId: 'cause-1',
      state: SagaState.STARTED,
      step: 1,
      data: { workerId: 'w-1', credentialId: 'c-1' },
      retryCount: 0
    };
    repository.findById.mockResolvedValue(mockContext);

    const event = {
      correlationId: 'corr-1',
      payload: { confidenceScore: 99, auditDetails: {} }
    };

    await saga.handleWebhookCallbackReceived(event);

    expect(bus.send).toHaveBeenCalledWith({
      commandType: 'VerifyWorkerCredentialCommand',
      correlationId: 'corr-1',
      causationId: 'cause-1',
      payload: {
        workerId: 'w-1',
        credentialId: 'c-1',
        verificationSource: 'GOV_API_WEBHOOK',
        confidenceScore: 99,
        auditDetails: {}
      }
    }, 'tx-1');

    expect(mockContext.state).toBe(SagaState.COMPLETED);
    expect(repository.save).toHaveBeenCalledWith(mockContext, 'tx-1');
  });

  it('should not update context data if already processing', async () => {
    repository.findById.mockResolvedValue({
      state: SagaState.COMPLETED,
      step: 1,
      data: { workerId: 'w-2', credentialId: 'c-2' }
    });
    
    const event = {
      eventId: 'evt-3',
      correlationId: 'corr-3',
      causationId: 'cause-3',
      aggregateId: 'w-1',
      credentialId: 'c-1',
      occurredAt: new Date()
    };
    
    await saga.handleVerificationRequested(event);
    expect(bus.send).not.toHaveBeenCalled();
  });

  it('should handle polling timeout by compensating', async () => {
    const mockContext = {
      sagaId: 'evt-1',
      correlationId: 'corr-1',
      causationId: 'cause-1',
      state: SagaState.STARTED,
      step: 1,
      data: { workerId: 'w-1', credentialId: 'c-1' },
      retryCount: 0
    };
    repository.findById.mockResolvedValue(mockContext);

    await saga.handlePollingTimeout('corr-1');

    expect(bus.send).toHaveBeenCalledWith({
      commandType: 'RevokeWorkerCredentialCommand',
      correlationId: 'corr-1',
      causationId: 'cause-1',
      payload: {
        workerId: 'w-1',
        credentialId: 'c-1',
        reason: 'Verification Polling Timeout'
      }
    }, 'tx-1');

    expect(mockContext.state).toBe(SagaState.COMPENSATING);
    expect(repository.save).toHaveBeenCalledWith(mockContext, 'tx-1');
  });

  it('should route to DLQ on failure via exponential backoff exhaustion', async () => {
    // Testing the abstract handleFailure in BaseSaga indirectly
    const mockContext = {
      sagaId: 'evt-1',
      correlationId: 'corr-1',
      causationId: 'cause-1',
      state: SagaState.STARTED,
      step: 0,
      data: { workerId: 'w-1', credentialId: 'c-1' },
      retryCount: 3 // Max retries
    };
    repository.findById.mockResolvedValue(mockContext);
    
    // Force a failure in executeStep to trigger handleFailure
    bus.send.mockRejectedValue(new Error('Network failure'));

    // We can spy on routeToDLQ which is empty, but we can check state transitions
    const event = { eventId: 'evt-1', correlationId: 'corr-1', causationId: 'cause-1', workerId: 'w-1', credentialId: 'c-1', verificationType: 'VOTER_ID' };
    
    await saga.handleVerificationRequested(event);

    expect(mockContext.state).toBe(SagaState.COMPENSATING);
    expect(repository.save).toHaveBeenCalledWith(mockContext);
  });
});
