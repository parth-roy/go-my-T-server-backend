export interface IntegrationEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  correlationId: string;
  causationId: string;
  occurredAt: Date;
  payload: any;
}

export class WorkerComplianceSuspendedIntegrationEvent implements IntegrationEvent {
  public readonly eventType = 'WorkerComplianceSuspendedIntegrationEvent';
  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly correlationId: string,
    public readonly causationId: string,
    public readonly occurredAt: Date,
    public readonly payload: { workerId: string; reason: string }
  ) {}
}

export class CryptoShreddingTriggeredIntegrationEvent implements IntegrationEvent {
  public readonly eventType = 'CryptoShreddingTriggeredIntegrationEvent';
  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly correlationId: string,
    public readonly causationId: string,
    public readonly occurredAt: Date,
    public readonly payload: { workerId: string; documentId: string }
  ) {}
}
