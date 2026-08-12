import { OrgRole } from '../value-objects/org-role.vo';

export class OrganizationMemberJoinedEvent {
  constructor(
    public readonly membershipId: string,
    public readonly organizationId: string,
    public readonly userId: string,
    public readonly role: OrgRole,
    public readonly occurredAt: Date = new Date()
  ) {}
}
