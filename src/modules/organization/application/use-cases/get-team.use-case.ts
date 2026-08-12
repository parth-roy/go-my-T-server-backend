import { ITeamRepository } from '../../domain/repositories/team.repository.interface';
import { AppError } from '@shared/errors/AppError';
import { TeamResponseDto } from '../dtos/team.dto';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { RequestContext } from '@shared/context/request-context';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';

export class GetTeamUseCase {
  constructor(private readonly teamRepo: ITeamRepository) {}

  async execute(context: RequestContext, branchId: string, departmentId: string, teamId: string): Promise<TeamResponseDto> {
    const organizationId = context.organization!.id;
    if (!organizationId) {
      throw AppError.internal('Organization Context Missing');
    }

    const caps = CapabilityResolver.resolve(context.platformIdentity.role as any);
    MembershipPolicy.assertCapability(caps, 'VIEW_TEAM');

    const team = await this.teamRepo.findById(organizationId, branchId, departmentId, teamId);
    if (!team) {
      throw AppError.notFound('Team not found');
    }

    return {
      id: team.getId(),
      organizationId: team.getOrganizationId(),
      branchId: team.getBranchId(),
      departmentId: team.getDepartmentId(),
      name: team.getName(),
      code: team.getCode(),
      description: team.getDescription(),
      leaderId: team.getLeaderId(),
      status: team.getStatus(),
      createdAt: team.getCreatedAt(),
      updatedAt: team.getUpdatedAt()
    };
  }
}
