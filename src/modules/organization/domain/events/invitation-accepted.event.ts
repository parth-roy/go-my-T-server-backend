export class InvitationAcceptedEvent {
  constructor(
    public readonly invitationId: string,
    public readonly organizationId: string,
    public readonly userId: string,
    public readonly occurredAt: Date = new Date()
  ) {}
}
