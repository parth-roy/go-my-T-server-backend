import { describe, it, expect } from 'vitest';
import { 
  WorkerComplianceSuspendedIntegrationEvent,
  CryptoShreddingTriggeredIntegrationEvent 
} from '../IntegrationEvents';

describe('ComplianceIntegrationEvents', () => {
  it('should instantiate WorkerComplianceSuspendedIntegrationEvent', () => {
    const event = new WorkerComplianceSuspendedIntegrationEvent('evt-1', 'w-1', 'corr', 'cause', new Date(), { workerId: 'w-1', reason: 'reason' });
    expect(event.payload.workerId).toBe('w-1');
    expect(event.payload.reason).toBe('reason');
    expect(event.eventType).toBe('WorkerComplianceSuspendedIntegrationEvent');
  });

  it('should instantiate CryptoShreddingTriggeredIntegrationEvent', () => {
    const event = new CryptoShreddingTriggeredIntegrationEvent('evt-1', 'w-1', 'corr', 'cause', new Date(), { workerId: 'w-1', documentId: 'c-1' });
    expect(event.payload.documentId).toBe('c-1');
    expect(event.eventType).toBe('CryptoShreddingTriggeredIntegrationEvent');
  });
});
