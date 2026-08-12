import { IDepartmentRepository } from '../../domain/repositories/department.repository.interface';
import { DepartmentEntity } from '../../domain/entities/department.entity';
import { AppError } from '@shared/errors/AppError';
import { UpdateDepartmentDto, DepartmentResponseDto } from '../dtos/department.dto';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { RequestContext } from '@shared/context/request-context';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { OrgRole } from '../../domain/value-objects/org-role.vo';
import { DepartmentManagerValidatorDomainService } from '../../domain/services/department-manager-validator.domain-service';
import { eventBus } from '@shared/eventbus';

export class UpdateDepartmentUseCase {
  constructor(
    private readonly departmentRepo: IDepartmentRepository,
    private readonly managerValidator: DepartmentManagerValidatorDomainService
  ) {}

  async execute(context: RequestContext, branchId: string, departmentId: string, dto: UpdateDepartmentDto): Promise<DepartmentResponseDto> {
    const actorRole = new OrgRole(context.platformIdentity.role);
    const actorCapabilities = CapabilityResolver.resolve(actorRole.value);
    MembershipPolicy.assertCapability(actorCapabilities, 'UPDATE_DEPARTMENT');
    const organizationId = context.organization!.id;

    const department = await this.departmentRepo.findById(organizationId, branchId, departmentId);
    if (!department) {
      throw AppError.notFound('Department not found');
    }

    if (dto.name && dto.name !== department.name) {
      const existingName = await this.departmentRepo.findByName(organizationId, branchId, dto.name);
      if (existingName) {
        throw AppError.badRequest('Department name already exists in this branch');
      }
    }

    if (dto.managerId && dto.managerId !== department.managerId) {
      await this.managerValidator.validateManager(organizationId, dto.managerId);
    }

    department.update({
      name: dto.name,
      description: dto.description,
      managerId: dto.managerId,
      status: dto.status,
    });

    await this.departmentRepo.save(department);

    eventBus.emit('department.updated', {
      organizationId,
      branchId,
      departmentId,
      timestamp: department.updatedAt,
    });

    return {
      ...department.toJSON(),
    };
  }
}
