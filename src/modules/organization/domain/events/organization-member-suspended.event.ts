export class OrganizationMemberSuspendedEvent {
  constructor(
    public readonly organizationId: string,
    public readonly targetMemberId: string,
    public readonly actorId: string,
    public readonly previousState: string,
    public readonly newState: string,
    public readonly occurredAt: Date = new Date()
  ) {}
}
