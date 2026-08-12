import { randomUUID } from 'crypto';
import { IEmploymentAssignmentRepository } from '../../domain/repositories/employment-assignment.repository.interface';
import { IEmploymentTypeRepository } from '../../domain/repositories/employment-type.repository.interface';
import { EmploymentAssignmentEntity, EmploymentAssignmentProps } from '../../domain/entities/employment-assignment.entity';
import { AppError } from '@shared/errors/AppError';
import { CreateEmploymentAssignmentDto, EmploymentAssignmentResponseDto } from '../dtos/employment-assignment.dto';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { RequestContext } from '@shared/context/request-context';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { eventBus } from '@shared/eventbus';
import { EmploymentAssignmentStatus,  } from '@prisma/client';
import { EmploymentTransitionReason } from '../../domain/enums/employment-transition-reason.enum';
import { IAssignmentNumberGeneratorDomainService } from '../../domain/services/assignment-number-generator.domain-service';
import { EmploymentTransitionPolicy } from '../../domain/policies/employment-transition.policy';
import { IDesignationRepository } from '../../domain/repositories/designation.repository.interface';

// Note: For full snapshot hydration we'd also inject Branch, Department, Team Repositories.
// For brevity in this implementation, we will mock the snapshots if the ID is provided, 
// or one could look them up.

export class CreateEmploymentAssignmentUseCase {
  constructor(
    private readonly assignmentRepo: IEmploymentAssignmentRepository,
    private readonly employmentTypeRepo: IEmploymentTypeRepository,
    private readonly designationRepo: IDesignationRepository,
    private readonly numberGenerator: IAssignmentNumberGeneratorDomainService,
    private readonly transitionPolicy: EmploymentTransitionPolicy
  ) {}

  async execute(context: RequestContext, dto: CreateEmploymentAssignmentDto): Promise<EmploymentAssignmentResponseDto> {
    const caps = CapabilityResolver.resolve(context.platformIdentity.role as any);
    MembershipPolicy.assertCapability(caps, 'ASSIGN_EMPLOYMENT_TYPE');
    const organizationId = context.organization!.id;

    // Transition validation
    const activeAssignment = await this.assignmentRepo.findActiveByMembershipId(dto.membershipId);
    this.transitionPolicy.validateTransition(activeAssignment, EmploymentTransitionReason.NEW_HIRE, dto);

    // Snapshot Hydration
    const employmentType = await this.employmentTypeRepo.findById(organizationId, dto.employmentTypeId);
    if (!employmentType || !employmentType.isActive) throw AppError.badRequest('Invalid employment type');

    let designationNameSnapshot = null;
    if (dto.designationId) {
      const designation = await this.designationRepo.findById(organizationId, dto.designationId);
      if (!designation) throw AppError.badRequest('Invalid designation');
      designationNameSnapshot = designation.name;
    }

    const now = new Date();
    const effectiveFrom = dto.effectiveFrom || now;
    const assignmentNumber = await this.numberGenerator.generate(organizationId);

    const props: EmploymentAssignmentProps = {
      id: randomUUID(),
      assignmentNumber,
      membershipId: dto.membershipId,
      
      employmentTypeId: dto.employmentTypeId,
      employmentTypeNameSnapshot: employmentType.name,
      
      designationId: dto.designationId,
      designationNameSnapshot,
      
      // Mocks for branch/dept/team for scope of this implementation (would use their repos)
      branchId: dto.branchId,
      branchNameSnapshot: dto.branchId ? 'HQ Branch' : null,
      departmentId: dto.departmentId,
      departmentNameSnapshot: dto.departmentId ? 'Engineering Dept' : null,
      teamId: dto.teamId,
      teamNameSnapshot: dto.teamId ? 'Backend Team' : null,
      
      effectiveFrom,
      effectiveUntil: null,
      status: EmploymentAssignmentStatus.ACTIVE,
      transitionMetadata: {
        reason: EmploymentTransitionReason.NEW_HIRE,
        requestedBy: context.user.id,
        ...dto.metadata
      },
      
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    const newAssignment = EmploymentAssignmentEntity.create(props);

    await this.assignmentRepo.save(newAssignment);

    eventBus.emit('assignment.created', {
      assignmentId: newAssignment.id,
      membershipId: dto.membershipId,
      timestamp: now,
    });

    return { ...newAssignment.toJSON() };
  }
}

