import { BaseSaga, SagaContext, SagaState } from './BaseSaga';

export class CredentialVerificationSaga extends BaseSaga {
  public async handleVerificationRequested(event: any): Promise<void> {
    const context = await this.loadOrCreateContext(event.eventId, event.correlationId, event.causationId);
    
    // Store credential details in saga context data
    if (context.state === SagaState.STARTED && context.step === 0) {
      context.data.workerId = event.workerId;
      context.data.credentialId = event.credentialId;
      context.data.verificationType = event.verificationType;
    }

    await this.executeStep(
      context,
      async (ctx, tx) => {
        // Step 1: Send external verification command to Integration Layer (e.g., Gov API adapter)
        await this.bus.send({
          commandType: 'RequestExternalGovVerificationCommand',
          correlationId: ctx.correlationId,
          causationId: ctx.causationId,
          payload: {
            credentialId: ctx.data.credentialId,
            verificationType: ctx.data.verificationType
          }
        }, tx);
      },
      async (ctx, tx) => {
        // Compensation: If external verification irreparably fails, mark credential as VERIFICATION_FAILED
        await this.bus.send({
          commandType: 'RevokeWorkerCredentialCommand',
          correlationId: ctx.correlationId,
          causationId: ctx.causationId,
          payload: {
            workerId: ctx.data.workerId,
            credentialId: ctx.data.credentialId,
            reason: 'External Verification Failed'
          }
        }, tx);
      }
    );
  }

  public async handleWebhookCallbackReceived(event: any): Promise<void> {
    // Resume saga on webhook callback
    const context = await this.repository.findById(event.correlationId);
    if (!context || context.state !== SagaState.STARTED) return;

    await this.executeStep(
      context,
      async (ctx, tx) => {
        // Step 2: Receive callback, dispatch domain command to update credential
        await this.bus.send({
          commandType: 'VerifyWorkerCredentialCommand',
          correlationId: ctx.correlationId,
          causationId: ctx.causationId,
          payload: {
            workerId: ctx.data.workerId,
            credentialId: ctx.data.credentialId,
            verificationSource: 'GOV_API_WEBHOOK',
            confidenceScore: event.payload.confidenceScore,
            auditDetails: event.payload.auditDetails
          }
        }, tx);
        
        ctx.state = SagaState.COMPLETED; // Complete the saga
      }
    );
  }

  public async handlePollingTimeout(correlationId: string): Promise<void> {
    const context = await this.repository.findById(correlationId);
    if (!context || context.state !== SagaState.STARTED) return;

    // Trigger compensation manually due to timeout
    context.state = SagaState.COMPENSATING;
    await this.executeStep(context, async () => {}, async (ctx, tx) => {
       await this.bus.send({
          commandType: 'RevokeWorkerCredentialCommand',
          correlationId: ctx.correlationId,
          causationId: ctx.causationId,
          payload: {
            workerId: ctx.data.workerId,
            credentialId: ctx.data.credentialId,
            reason: 'Verification Polling Timeout'
          }
        }, tx);
    });
  }
}
