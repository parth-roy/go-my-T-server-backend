import { BaseSaga, SagaContext, SagaState } from './BaseSaga';
import { CryptoShreddingTriggeredIntegrationEvent } from '../integration/IntegrationEvents';

export class DocumentLifecycleSaga extends BaseSaga {

  public async handleDocumentArchiveRequested(event: any): Promise<void> {
    const context = await this.loadOrCreateContext(event.eventId, event.correlationId, event.causationId);
    
    if (context.state === SagaState.STARTED && context.step === 0) {
      context.data.workerId = event.aggregateId;
      context.data.documentId = event.credentialId;
    }

    await this.executeStep(
      context,
      async (ctx, tx) => {
        // Send integration command to Storage/Document context
        await this.bus.send({
          commandType: 'ArchiveDocumentCommand',
          correlationId: ctx.correlationId,
          causationId: ctx.causationId,
          payload: {
            documentId: ctx.data.documentId,
            workerId: ctx.data.workerId
          }
        }, tx);
        ctx.state = SagaState.COMPLETED;
      }
    );
  }

  public async handleCryptoShreddingRequested(event: any): Promise<void> {
    const context = await this.loadOrCreateContext(event.eventId, event.correlationId, event.causationId);
    
    if (context.state === SagaState.STARTED && context.step === 0) {
      context.data.workerId = event.aggregateId;
      context.data.documentId = event.credentialId;
    }

    await this.executeStep(
      context,
      async (ctx, tx) => {
        // 1. Publish integration event for Key Management Service (KMS) to destroy the Data Encryption Key (DEK).
        const integrationEvent = new CryptoShreddingTriggeredIntegrationEvent(
          crypto.randomUUID(),
          ctx.data.workerId,
          ctx.correlationId,
          ctx.causationId,
          new Date(),
          {
            workerId: ctx.data.workerId,
            documentId: ctx.data.documentId
          }
        );
        
        await this.bus.publish(integrationEvent, tx);
        
        // 2. Send command to Storage Context to physically purge ciphertexts if required by policy.
        await this.bus.send({
          commandType: 'PurgeDocumentCiphertextCommand',
          correlationId: ctx.correlationId,
          causationId: ctx.causationId,
          payload: {
            documentId: ctx.data.documentId,
            workerId: ctx.data.workerId
          }
        }, tx);

        ctx.state = SagaState.COMPLETED;
      }
    );
  }
}
