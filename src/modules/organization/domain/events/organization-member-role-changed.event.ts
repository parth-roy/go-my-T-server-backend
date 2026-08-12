export class OrganizationMemberRoleChangedEvent {
  constructor(
    public readonly organizationId: string,
    public readonly targetMemberId: string,
    public readonly actorId: string,
    public readonly previousRole: string,
    public readonly newRole: string,
    public readonly occurredAt: Date = new Date()
  ) {}
}
