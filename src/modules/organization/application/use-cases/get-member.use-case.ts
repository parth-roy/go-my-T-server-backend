import { IOrganizationMembershipRepository } from '../../domain/repositories/membership.repository.interface';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { OrgRole } from '../../domain/value-objects/org-role.vo';
import { RequestContext } from '@shared/context/request-context';
import { AppError } from '@shared/errors/AppError';

export class GetMemberUseCase {
  constructor(private readonly membershipRepo: IOrganizationMembershipRepository) {}

  async execute(context: RequestContext, targetMemberId: string) {
    const actorRole = new OrgRole(context.platformIdentity.role);
    const actorCapabilities = CapabilityResolver.resolve(actorRole.value);
    
    // Authorize
    MembershipPolicy.assertCapability(actorCapabilities, 'VIEW_MEMBERS');

    const member = await this.membershipRepo.findById(targetMemberId);
    
    if (!member) {
      throw AppError.notFound('Member not found');
    }

    if (member.getOrganizationId() !== context.workspace!.id) {
      throw AppError.forbidden('Cannot view member of another organization');
    }

    return {
      id: member.getId(),
      userId: member.getUserId(),
      role: member.getRole(),
      status: member.getStatus(),
      joinedAt: member.getJoinedAt(),
      updatedAt: member.getUpdatedAt()
    };
  }
}
