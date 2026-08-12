import { IDepartmentRepository } from '../../domain/repositories/department.repository.interface';
import { AppError } from '@shared/errors/AppError';
import { DepartmentResponseDto } from '../dtos/department.dto';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { RequestContext } from '@shared/context/request-context';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { OrgRole } from '../../domain/value-objects/org-role.vo';

export class GetDepartmentUseCase {
  constructor(private readonly departmentRepo: IDepartmentRepository) {}

  async execute(context: RequestContext, branchId: string, departmentId: string): Promise<DepartmentResponseDto> {
    const actorRole = new OrgRole(context.platformIdentity.role);
    const actorCapabilities = CapabilityResolver.resolve(actorRole.value);
    MembershipPolicy.assertCapability(actorCapabilities, 'VIEW_DEPARTMENT');
    const organizationId = context.organization!.id;

    const department = await this.departmentRepo.findById(organizationId, branchId, departmentId);
    if (!department) {
      throw AppError.notFound('Department not found');
    }

    return department.toJSON();
  }
}
