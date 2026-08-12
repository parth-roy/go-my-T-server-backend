import { randomUUID } from 'crypto';
import { IDepartmentRepository } from '../../domain/repositories/department.repository.interface';
import { IBranchRepository } from '../../domain/repositories/branch.repository.interface';
import { DepartmentEntity, DepartmentProps } from '../../domain/entities/department.entity';
import { DepartmentStatus } from '../../domain/enums/department-status.enum';
import { BranchStatus } from '../../domain/enums/branch.enum';
import { AppError } from '@shared/errors/AppError';
import { CreateDepartmentDto, DepartmentResponseDto } from '../dtos/department.dto';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { RequestContext } from '@shared/context/request-context';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { OrgRole } from '../../domain/value-objects/org-role.vo';
import { DepartmentCodeGeneratorDomainService } from '../../domain/services/department-code-generator.domain-service';
import { DepartmentManagerValidatorDomainService } from '../../domain/services/department-manager-validator.domain-service';
import { eventBus } from '@shared/eventbus';

export class CreateDepartmentUseCase {
  constructor(
    private readonly departmentRepo: IDepartmentRepository,
    private readonly branchRepo: IBranchRepository,
    private readonly managerValidator: DepartmentManagerValidatorDomainService
  ) {}

  async execute(context: RequestContext, branchId: string, dto: CreateDepartmentDto): Promise<DepartmentResponseDto> {
    const actorRole = new OrgRole(context.platformIdentity.role);
    const actorCapabilities = CapabilityResolver.resolve(actorRole.value);
    MembershipPolicy.assertCapability(actorCapabilities, 'CREATE_DEPARTMENT');
    const organizationId = context.organization!.id;

    // 1. Branch Validation
    const branch = await this.branchRepo.findById(organizationId, branchId);
    if (!branch) {
      throw AppError.notFound('Branch not found');
    }
    if (branch.getStatus() !== BranchStatus.ACTIVE) {
      throw AppError.badRequest('Branch is not active');
    }

    // 2. Uniqueness Checks
    const existingName = await this.departmentRepo.findByName(organizationId, branchId, dto.name);
    if (existingName) {
      throw AppError.badRequest('Department name already exists in this branch');
    }

    const code = DepartmentCodeGeneratorDomainService.generateCode(dto.code);
    const existingCode = await this.departmentRepo.findByCode(organizationId, branchId, code);
    if (existingCode) {
      throw AppError.badRequest('Department code already exists in this branch');
    }

    // 3. Manager Validation
    if (dto.managerId) {
      await this.managerValidator.validateManager(organizationId, dto.managerId);
    }

    const departmentId = randomUUID();
    const now = new Date();

    const props: DepartmentProps = {
      id: departmentId,
      organizationId,
      branchId,
      name: dto.name,
      code,
      description: dto.description || null,
      managerId: dto.managerId || null,
      status: DepartmentStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const department = DepartmentEntity.create(props);

    // 4. Save and Emit
    await this.departmentRepo.save(department);

    eventBus.emit('department.created', {
      organizationId,
      branchId,
      departmentId,
      timestamp: now,
    });

    return {
      ...department.toJSON(),
    };
  }
}
