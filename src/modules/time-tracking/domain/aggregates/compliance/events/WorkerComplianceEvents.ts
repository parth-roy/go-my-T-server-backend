export abstract class DomainEvent {
  public readonly occurredAt: Date;
  constructor(public readonly eventId: string, public readonly aggregateId: string) {
    this.occurredAt = new Date();
  }
}

export class WorkerComplianceStatusChangedEvent extends DomainEvent {
  constructor(
    eventId: string,
    aggregateId: string,
    public readonly organizationId: string,
    public readonly workerId: string,
    public readonly oldStatus: string,
    public readonly newStatus: string,
    public readonly reason: string
  ) {
    super(eventId, aggregateId);
  }
}

export class WorkerCredentialAddedEvent extends DomainEvent {
  constructor(
    eventId: string,
    aggregateId: string,
    public readonly organizationId: string,
    public readonly workerId: string,
    public readonly credentialId: string,
    public readonly type: string
  ) {
    super(eventId, aggregateId);
  }
}

export class WorkerCredentialRevokedEvent extends DomainEvent {
  constructor(
    eventId: string,
    aggregateId: string,
    public readonly organizationId: string,
    public readonly workerId: string,
    public readonly credentialId: string,
    public readonly reason: string
  ) {
    super(eventId, aggregateId);
  }
}
