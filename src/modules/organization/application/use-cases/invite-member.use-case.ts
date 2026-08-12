import { randomUUID } from 'crypto';
import { IInvitationRepository } from '../../domain/repositories/invitation.repository.interface';
import { IOrganizationMembershipRepository } from '../../domain/repositories/membership.repository.interface';
import { OrganizationMembershipInvitation } from '../../domain/aggregates/invitation.aggregate';
import { InvitationPolicy } from '../../domain/policies/invitation.policy';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { MemberInvitedEvent } from '../../domain/events/member-invited.event';
import { AppError } from '@shared/errors/AppError';
import { OrgRole } from '../../domain/value-objects/org-role.vo';
import { RequestContext } from '@shared/context/request-context';

export interface InviteMemberCommand {
  phone: string;
  email?: string;
  role: string;
}

export class InviteMemberUseCase {
  constructor(
    private readonly invitationRepo: IInvitationRepository,
    private readonly membershipRepo: IOrganizationMembershipRepository,
    // eventDispatcher: IEventDispatcher
  ) {}

  async execute(context: RequestContext, command: InviteMemberCommand): Promise<void> {
    if (context.workspace.type !== 'ORGANIZATION') {
      throw AppError.forbidden('Must be in an organization workspace');
    }
    const organizationId = context.workspace.id;

    const targetRole = new OrgRole(command.role);
    const inviterId = context.user.id;
    const inviterRole = new OrgRole(context.platformIdentity.role);

    // 1. Resolve Capabilities
    const inviterCapabilities = CapabilityResolver.resolve(inviterRole.value);

    // 2. Authorize
    InvitationPolicy.assertCanInvite(inviterCapabilities, targetRole);

    // 3. Prevent duplicate active memberships
    const existingMember = await this.membershipRepo.findByPhoneAndOrg(command.phone, organizationId);
    if (existingMember && existingMember.getStatus() === 'ACTIVE') {
      throw AppError.conflict('User is already an active member of this organization');
    }

    // 4. Handle existing pending invitations
    let invitation: OrganizationMembershipInvitation;
    let rawToken: string;

    const existingInvitation = await this.invitationRepo.findPendingByPhone(organizationId, command.phone);

    if (existingInvitation) {
      // Re-use and refresh existing invitation
      rawToken = existingInvitation.refresh();
      invitation = existingInvitation;
    } else {
      // Create new
      const result = OrganizationMembershipInvitation.create({
        id: randomUUID(),
        organizationId,
        phone: command.phone,
        email: command.email,
        role: targetRole,
        inviterId,
        capabilitySnapshot: CapabilityResolver.resolve(targetRole.value).map(c => c.value)
      });
      invitation = result.invitation;
      rawToken = result.rawToken;
    }

    // 5. Persist
    await this.invitationRepo.save(invitation);

    // 6. Dispatch Event
    const event = new MemberInvitedEvent(
      invitation.id,
      invitation.organizationId,
      invitation.phone,
      invitation.role,
      rawToken,
      inviterId
    );
    
    // In M2 this will dispatch: await this.eventDispatcher.dispatch(event);
    console.log(`[EVENT] MemberInvitedEvent dispatched for ${invitation.phone}`);
  }
}
