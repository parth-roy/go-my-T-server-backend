import { IOrganizationMembershipRepository } from '../../domain/repositories/membership.repository.interface';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { OrgRole } from '../../domain/value-objects/org-role.vo';
import { RequestContext } from '@shared/context/request-context';

export interface ListMembersCommand {
  page?: number;
  limit?: number;
  status?: string;
  role?: string;
  search?: string;
  sort?: string;
}

export class ListMembersUseCase {
  constructor(private readonly membershipRepo: IOrganizationMembershipRepository) {}

  async execute(context: RequestContext, command: ListMembersCommand) {
    const actorRole = new OrgRole(context.platformIdentity.role);
    const actorCapabilities = CapabilityResolver.resolve(actorRole.value);
    
    // Authorize
    MembershipPolicy.assertCapability(actorCapabilities, 'VIEW_MEMBERS');

    const options = {
      page: command.page || 1,
      limit: command.limit || 20,
      status: command.status,
      role: command.role,
      search: command.search,
      sort: command.sort
    };

    const result = await this.membershipRepo.findMany(context.workspace!.id, options);

    return {
      members: result.data.map(m => ({
        id: m.getId(),
        userId: m.getUserId(),
        role: m.getRole(),
        status: m.getStatus(),
        joinedAt: m.getJoinedAt()
      })),
      total: result.total,
      page: options.page,
      limit: options.limit
    };
  }
}
