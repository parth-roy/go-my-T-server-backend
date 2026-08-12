import { IOrganizationMembershipRepository } from '../../domain/repositories/membership.repository.interface';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { OrgRole } from '../../domain/value-objects/org-role.vo';
import { RequestContext } from '@shared/context/request-context';
import { AppError } from '@shared/errors/AppError';
import { OrganizationMemberTerminatedEvent } from '../../domain/events/organization-member-terminated.event';
import { prisma } from '@shared/db/prisma';
import { OrganizationMembershipRepository } from '../../infrastructure/repositories/membership.repository';

export class TerminateMemberUseCase {
  constructor(private readonly membershipRepo: IOrganizationMembershipRepository) {}

  async execute(context: RequestContext, targetMemberId: string) {
    const actorRole = new OrgRole(context.platformIdentity.role);
    const actorCapabilities = CapabilityResolver.resolve(actorRole.value);
    
    // Authorize
    MembershipPolicy.assertCapability(actorCapabilities, 'REMOVE_MEMBER');

    await prisma.$transaction(async (tx) => {
      const member = await this.membershipRepo.findById(targetMemberId);
      if (!member) throw AppError.notFound('Member not found');

      if (member.getOrganizationId() !== context.workspace!.id) {
        throw AppError.forbidden('Cannot modify member of another organization');
      }

      // Rule: cannot remove self
      MembershipPolicy.assertNotSelf(member.getUserId(), context.user.id, 'remove');

      const previousState = member.getStatus();

      // The aggregate ensures we don't terminate a primary owner
      member.terminate(new Date());

      const txMembershipRepo = new OrganizationMembershipRepository(tx);
      await txMembershipRepo.update(member);

      const event = new OrganizationMemberTerminatedEvent(
        context.workspace!.id,
        targetMemberId,
        context.user.id,
        previousState,
        member.getStatus(),
        new Date()
      );
      
      console.log('[EVENT] OrganizationMemberTerminatedEvent dispatched for', targetMemberId);
    });
  }
}
