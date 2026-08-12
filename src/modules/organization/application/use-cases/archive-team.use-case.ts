import { ITeamRepository } from '../../domain/repositories/team.repository.interface';
import { AppError } from '@shared/errors/AppError';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { RequestContext } from '@shared/context/request-context';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { eventBus } from '@shared/eventbus';

export class ArchiveTeamUseCase {
  constructor(private readonly teamRepo: ITeamRepository) {}

  async execute(context: RequestContext, branchId: string, departmentId: string, teamId: string): Promise<void> {
    const organizationId = context.organization!.id;
    if (!organizationId) {
      throw AppError.internal('Organization Context Missing');
    }

    const caps = CapabilityResolver.resolve(context.platformIdentity.role as any);
    MembershipPolicy.assertCapability(caps, 'ARCHIVE_TEAM');

    const team = await this.teamRepo.findById(organizationId, branchId, departmentId, teamId);
    if (!team) {
      throw AppError.notFound('Team not found');
    }

    // Future check: verify if there are any active Projects, Shifts, Workforce Assignments, etc.
    
    const now = new Date();
    team.archive(now);

    const saved = await this.teamRepo.update(team);

    eventBus.emit('team.archived', {
      teamId: saved.getId(),
      departmentId: saved.getDepartmentId(),
      branchId: saved.getBranchId(),
      organizationId: saved.getOrganizationId(),
      timestamp: now
    });
  }
}
