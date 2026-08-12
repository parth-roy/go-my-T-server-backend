import { ITeamRepository } from '../../domain/repositories/team.repository.interface';
import { AppError } from '@shared/errors/AppError';
import { UpdateTeamDto, TeamResponseDto } from '../dtos/team.dto';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { RequestContext } from '@shared/context/request-context';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { eventBus } from '@shared/eventbus';
import { TeamLeaderValidatorDomainService } from '../../domain/services/team-leader-validator.domain-service';

export class UpdateTeamUseCase {
  constructor(
    private readonly teamRepo: ITeamRepository,
    private readonly leaderValidator: TeamLeaderValidatorDomainService
  ) {}

  async execute(
    context: RequestContext,
    branchId: string,
    departmentId: string,
    teamId: string,
    dto: UpdateTeamDto
  ): Promise<TeamResponseDto> {
    const organizationId = context.organization!.id;
    if (!organizationId) {
      throw AppError.internal('Organization Context Missing');
    }

    const caps = CapabilityResolver.resolve(context.platformIdentity.role as any);
    MembershipPolicy.assertCapability(caps, 'UPDATE_TEAM');

    const team = await this.teamRepo.findById(organizationId, branchId, departmentId, teamId);
    if (!team) {
      throw AppError.notFound('Team not found');
    }

    if (dto.name && dto.name !== team.getName()) {
      const nameExists = await this.teamRepo.existsByName(organizationId, branchId, departmentId, dto.name);
      if (nameExists) {
        throw AppError.conflict('TeamNameAlreadyExistsError', `Team name ${dto.name} is already taken in this department`);
      }
    }

    if (dto.leaderId && dto.leaderId !== team.getLeaderId()) {
      await this.leaderValidator.validateLeader(organizationId, branchId, dto.leaderId);
    }

    const now = new Date();
    team.updateDetails(
      now,
      dto.name,
      dto.description,
      dto.leaderId
    );

    const saved = await this.teamRepo.update(team);

    eventBus.emit('team.updated', {
      teamId: saved.getId(),
      departmentId: saved.getDepartmentId(),
      branchId: saved.getBranchId(),
      organizationId: saved.getOrganizationId(),
      timestamp: now
    });

    return {
      id: saved.getId(),
      organizationId: saved.getOrganizationId(),
      branchId: saved.getBranchId(),
      departmentId: saved.getDepartmentId(),
      name: saved.getName(),
      code: saved.getCode(),
      description: saved.getDescription(),
      leaderId: saved.getLeaderId(),
      status: saved.getStatus(),
      createdAt: saved.getCreatedAt(),
      updatedAt: saved.getUpdatedAt()
    };
  }
}
