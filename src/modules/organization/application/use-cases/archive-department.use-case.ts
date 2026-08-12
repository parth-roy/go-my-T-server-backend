import { IDepartmentRepository } from '../../domain/repositories/department.repository.interface';
import { AppError } from '@shared/errors/AppError';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { RequestContext } from '@shared/context/request-context';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { OrgRole } from '../../domain/value-objects/org-role.vo';
import { eventBus } from '@shared/eventbus';

export class ArchiveDepartmentUseCase {
  constructor(private readonly departmentRepo: IDepartmentRepository) {}

  async execute(context: RequestContext, branchId: string, departmentId: string): Promise<void> {
    const actorRole = new OrgRole(context.platformIdentity.role);
    const actorCapabilities = CapabilityResolver.resolve(actorRole.value);
    MembershipPolicy.assertCapability(actorCapabilities, 'ARCHIVE_DEPARTMENT');
    const organizationId = context.organization!.id;

    const department = await this.departmentRepo.findById(organizationId, branchId, departmentId);
    if (!department) {
      throw AppError.notFound('Department not found');
    }

    // EXTENSION POINT:
    // Future validation: Ensure no active Teams, Projects, or Shifts are using this department
    // e.g. const hasActiveTeams = await teamRepo.countActiveByDepartment(departmentId);
    // if (hasActiveTeams) throw error;

    department.archive();

    await this.departmentRepo.save(department);

    eventBus.emit('department.archived', {
      organizationId,
      branchId,
      departmentId,
      timestamp: department.updatedAt,
    });
  }
}
