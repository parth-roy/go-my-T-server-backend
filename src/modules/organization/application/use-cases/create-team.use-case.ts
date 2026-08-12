import { ITeamRepository } from '../../domain/repositories/team.repository.interface';
import { IDepartmentRepository } from '../../domain/repositories/department.repository.interface';
import { IBranchRepository } from '../../domain/repositories/branch.repository.interface';
import { TeamEntity } from '../../domain/entities/team.entity';
import { TeamStatus } from '../../domain/enums/team-status.enum';
import { DepartmentStatus } from '../../domain/enums/department-status.enum';
import { BranchStatus } from '../../domain/enums/branch.enum';
import { AppError } from '@shared/errors/AppError';
import { CreateTeamDto, TeamResponseDto } from '../dtos/team.dto';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { RequestContext } from '@shared/context/request-context';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { eventBus } from '@shared/eventbus';
import { v4 as uuidv4 } from 'uuid';
import { TeamCodeGeneratorDomainService } from '../../domain/services/team-code-generator.domain-service';
import { TeamLeaderValidatorDomainService } from '../../domain/services/team-leader-validator.domain-service';

export class CreateTeamUseCase {
  constructor(
    private readonly teamRepo: ITeamRepository,
    private readonly departmentRepo: IDepartmentRepository,
    private readonly branchRepo: IBranchRepository,
    private readonly codeGenerator: TeamCodeGeneratorDomainService,
    private readonly leaderValidator: TeamLeaderValidatorDomainService
  ) {}

  async execute(
    context: RequestContext,
    branchId: string,
    departmentId: string,
    dto: CreateTeamDto
  ): Promise<TeamResponseDto> {
    const organizationId = context.organization!.id;
    if (!organizationId) {
      throw AppError.internal('Organization Context Missing');
    }

    // 1. Capability Check
    const role = context.platformIdentity.role;
    const caps = CapabilityResolver.resolve(role as any);
    MembershipPolicy.assertCapability(caps, 'CREATE_TEAM');

    // 2. Hierarchy Validation
    const branch = await this.branchRepo.findById(organizationId, branchId);
    if (!branch) {
      throw AppError.notFound('Branch not found in this organization');
    }
    if (branch.getStatus() !== BranchStatus.ACTIVE) {
      throw AppError.badRequest('Branch is not active');
    }

    const department = await this.departmentRepo.findById(organizationId, branchId, departmentId);
    if (!department) {
      throw AppError.notFound('Department not found in this branch');
    }
    if (department.status === DepartmentStatus.ARCHIVED) {
      throw AppError.badRequest('Department is archived');
    }
    if (department.status === DepartmentStatus.INACTIVE) {
      throw AppError.badRequest('Department is inactive');
    }

    // 3. Leader Validation
    if (dto.leaderId) {
      await this.leaderValidator.validateLeader(organizationId, branchId, dto.leaderId);
    }

    // 4. Code & Name Uniqueness
    const code = await this.codeGenerator.generate(organizationId, branchId, departmentId, dto.code);

    const nameExists = await this.teamRepo.existsByName(organizationId, branchId, departmentId, dto.name);
    if (nameExists) {
      throw AppError.conflict('TeamNameAlreadyExistsError', `Team name ${dto.name} is already taken in this department`);
    }

    // 5. Create Entity
    const id = uuidv4();
    const now = new Date();
    
    const team = TeamEntity.reconstitute({
      id,
      organizationId,
      branchId,
      departmentId,
      name: dto.name,
      code,
      description: dto.description || null,
      leaderId: dto.leaderId || null,
      status: TeamStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    });

    // 6. Save & Emit
    const saved = await this.teamRepo.create(team);

    eventBus.emit('team.created', {
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
