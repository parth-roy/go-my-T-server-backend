import { IDepartmentRepository, ListDepartmentsParams, ListDepartmentsResponse } from '../../domain/repositories/department.repository.interface';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { RequestContext } from '@shared/context/request-context';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { OrgRole } from '../../domain/value-objects/org-role.vo';
import { DepartmentResponseDto } from '../dtos/department.dto';

export interface ListDepartmentsResult {
  data: DepartmentResponseDto[];
  nextCursor?: string;
  hasNextPage: boolean;
}

export class ListDepartmentsUseCase {
  constructor(private readonly departmentRepo: IDepartmentRepository) {}

  async execute(context: RequestContext, branchId: string, params: ListDepartmentsParams): Promise<ListDepartmentsResult> {
    const actorRole = new OrgRole(context.platformIdentity.role);
    const actorCapabilities = CapabilityResolver.resolve(actorRole.value);
    MembershipPolicy.assertCapability(actorCapabilities, 'LIST_DEPARTMENTS');
    const organizationId = context.organization!.id;

    const result = await this.departmentRepo.list(organizationId, branchId, params);

    return {
      data: result.departments.map(d => d.toJSON()),
      nextCursor: result.nextCursor,
      hasNextPage: result.hasNextPage,
    };
  }
}
