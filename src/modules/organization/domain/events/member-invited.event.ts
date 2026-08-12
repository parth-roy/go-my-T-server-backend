import { OrgRole } from '../value-objects/org-role.vo';

export class MemberInvitedEvent {
  constructor(
    public readonly invitationId: string,
    public readonly organizationId: string,
    public readonly phone: string,
    public readonly role: OrgRole,
    public readonly rawToken: string, // Needed to dispatch SMS/Email
    public readonly inviterId: string,
    public readonly occurredAt: Date = new Date()
  ) {}
}
