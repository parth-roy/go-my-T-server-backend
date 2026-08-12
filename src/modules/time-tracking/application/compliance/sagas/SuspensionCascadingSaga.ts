import { BaseSaga, SagaContext, SagaState } from './BaseSaga';
import { WorkerComplianceSuspendedIntegrationEvent } from '../integration/IntegrationEvents';

export class SuspensionCascadingSaga extends BaseSaga {
  
  public async handleWorkerComplianceSuspended(domainEvent: any): Promise<void> {
    const context = await this.loadOrCreateContext(domainEvent.eventId, domainEvent.correlationId, domainEvent.causationId);
    
    if (context.state === SagaState.STARTED && context.step === 0) {
      context.data.workerId = domainEvent.aggregateId;
      context.data.reason = domainEvent.reason;
    }

    await this.executeStep(
      context,
      async (ctx, tx) => {
        // Broadcast the canonical integration event to external contexts
        // (Availability, Scheduling, Reliability, Marketplace)
        // We do NOT modify their databases directly.
        const integrationEvent = new WorkerComplianceSuspendedIntegrationEvent(
          crypto.randomUUID(),
          ctx.data.workerId,
          ctx.correlationId,
          ctx.causationId,
          new Date(),
          {
            workerId: ctx.data.workerId,
            reason: ctx.data.reason
          }
        );
        
        await this.bus.publish(integrationEvent, tx);
        
        ctx.state = SagaState.COMPLETED;
      }
    );
  }

  // Handle other compliance events that cascade out
  public async handleCredentialExpired(domainEvent: any): Promise<void> {
    // Similar broadcasting logic
  }

  public async handleComplianceRevoked(domainEvent: any): Promise<void> {
    // Similar broadcasting logic
  }
}
