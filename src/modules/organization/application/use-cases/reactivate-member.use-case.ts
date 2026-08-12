import { IOrganizationMembershipRepository } from '../../domain/repositories/membership.repository.interface';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { OrgRole } from '../../domain/value-objects/org-role.vo';
import { RequestContext } from '@shared/context/request-context';
import { AppError } from '@shared/errors/AppError';
import { OrganizationMemberReactivatedEvent } from '../../domain/events/organization-member-reactivated.event';
import { prisma } from '@shared/db/prisma';
import { OrganizationMembershipRepository } from '../../infrastructure/repositories/membership.repository';

export class ReactivateMemberUseCase {
  constructor(private readonly membershipRepo: IOrganizationMembershipRepository) {}

  async execute(context: RequestContext, targetMemberId: string) {
    const actorRole = new OrgRole(context.platformIdentity.role);
    const actorCapabilities = CapabilityResolver.resolve(actorRole.value);
    
    // Authorize
    MembershipPolicy.assertCapability(actorCapabilities, 'REACTIVATE_MEMBER');

    await prisma.$transaction(async (tx) => {
      const member = await this.membershipRepo.findById(targetMemberId);
      if (!member) throw AppError.notFound('Member not found');

      if (member.getOrganizationId() !== context.workspace!.id) {
        throw AppError.forbidden('Cannot modify member of another organization');
      }

      const previousState = member.getStatus();

      member.reactivate(new Date());

      const txMembershipRepo = new OrganizationMembershipRepository(tx);
      await txMembershipRepo.update(member);

      const event = new OrganizationMemberReactivatedEvent(
        context.workspace!.id,
        targetMemberId,
        context.user.id,
        previousState,
        member.getStatus(),
        new Date()
      );
      
      console.log('[EVENT] OrganizationMemberReactivatedEvent dispatched for', targetMemberId);
    });
  }
}
