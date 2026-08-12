import { randomUUID } from 'crypto';
import { IEmploymentAssignmentRepository } from '../../domain/repositories/employment-assignment.repository.interface';
import { IEmploymentTypeRepository } from '../../domain/repositories/employment-type.repository.interface';
import { EmploymentAssignmentEntity, EmploymentAssignmentProps, TransitionMetadata } from '../../domain/entities/employment-assignment.entity';
import { AppError } from '@shared/errors/AppError';
import { TransitionEmploymentAssignmentDto, EmploymentAssignmentResponseDto } from '../dtos/employment-assignment.dto';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { RequestContext } from '@shared/context/request-context';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { eventBus } from '@shared/eventbus';
import { EmploymentAssignmentStatus,  } from '@prisma/client';
import { EmploymentTransitionReason } from '../../domain/enums/employment-transition-reason.enum';
import { IAssignmentNumberGeneratorDomainService } from '../../domain/services/assignment-number-generator.domain-service';
import { EmploymentTransitionPolicy } from '../../domain/policies/employment-transition.policy';
import { IDesignationRepository } from '../../domain/repositories/designation.repository.interface';

export class TransitionEmploymentAssignmentUseCase {
  constructor(
    private readonly assignmentRepo: IEmploymentAssignmentRepository,
    private readonly employmentTypeRepo: IEmploymentTypeRepository,
    private readonly designationRepo: IDesignationRepository,
    private readonly numberGenerator: IAssignmentNumberGeneratorDomainService,
    private readonly transitionPolicy: EmploymentTransitionPolicy
  ) {}

  async execute(context: RequestContext, membershipId: string, dto: TransitionEmploymentAssignmentDto): Promise<EmploymentAssignmentResponseDto | void> {
    const caps = CapabilityResolver.resolve(context.platformIdentity.role as any);
    MembershipPolicy.assertCapability(caps, 'ASSIGN_EMPLOYMENT_TYPE');
    const organizationId = context.organization!.id;

    const activeAssignment = await this.assignmentRepo.findActiveByMembershipId(membershipId);
    if (!activeAssignment) {
      throw AppError.badRequest('Member has no active assignment to transition.');
    }

    // Prepare new context defaults (inheriting from active assignment unless overwritten)
    const newContext: Partial<EmploymentAssignmentProps> = {
      employmentTypeId: dto.employmentTypeId || activeAssignment.employmentTypeId,
      designationId: dto.designationId !== undefined ? dto.designationId : activeAssignment.designationId,
      branchId: dto.branchId !== undefined ? dto.branchId : activeAssignment.branchId,
      departmentId: dto.departmentId !== undefined ? dto.departmentId : activeAssignment.departmentId,
      teamId: dto.teamId !== undefined ? dto.teamId : activeAssignment.teamId,
    };

    // Domain Policy Validation
    this.transitionPolicy.validateTransition(activeAssignment, dto.reason, newContext);

    const now = new Date();
    const effectiveFrom = dto.effectiveFrom || now;

    // Snapshot Hydration for new values
    let employmentTypeNameSnapshot = activeAssignment.employmentTypeNameSnapshot;
    if (newContext.employmentTypeId !== activeAssignment.employmentTypeId) {
      const et = await this.employmentTypeRepo.findById(organizationId, newContext.employmentTypeId!);
      if (!et) throw AppError.badRequest('Invalid employment type');
      employmentTypeNameSnapshot = et.name;
    }

    let designationNameSnapshot = activeAssignment.designationNameSnapshot;
    if (newContext.designationId && newContext.designationId !== activeAssignment.designationId) {
      const d = await this.designationRepo.findById(organizationId, newContext.designationId);
      if (!d) throw AppError.badRequest('Invalid designation');
      designationNameSnapshot = d.name;
    } else if (newContext.designationId === null) {
      designationNameSnapshot = null;
    }

    // Terminate old assignment
    activeAssignment.terminate(effectiveFrom);
    await this.assignmentRepo.save(activeAssignment);

    // If it's a termination transition, we don't create a new active assignment.
    if (dto.reason === EmploymentTransitionReason.TERMINATION) {
      eventBus.emit('assignment.terminated', {
        assignmentId: activeAssignment.id,
        membershipId,
        timestamp: now
      });
      return;
    }

    const assignmentNumber = await this.numberGenerator.generate(organizationId);

    const metadata: TransitionMetadata = {
      reason: dto.reason,
      requestedBy: context.user.id,
      previousAssignmentId: activeAssignment.id,
      ...dto.metadata
    };

    const props: EmploymentAssignmentProps = {
      id: randomUUID(),
      assignmentNumber,
      membershipId,
      
      employmentTypeId: newContext.employmentTypeId!,
      employmentTypeNameSnapshot,
      
      designationId: newContext.designationId,
      designationNameSnapshot,
      
      branchId: newContext.branchId,
      branchNameSnapshot: newContext.branchId !== activeAssignment.branchId ? 'Changed Branch' : activeAssignment.branchNameSnapshot,
      departmentId: newContext.departmentId,
      departmentNameSnapshot: newContext.departmentId !== activeAssignment.departmentId ? 'Changed Dept' : activeAssignment.departmentNameSnapshot,
      teamId: newContext.teamId,
      teamNameSnapshot: newContext.teamId !== activeAssignment.teamId ? 'Changed Team' : activeAssignment.teamNameSnapshot,
      
      effectiveFrom,
      effectiveUntil: null,
      status: EmploymentAssignmentStatus.ACTIVE,
      transitionMetadata: metadata,
      
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    const newAssignment = EmploymentAssignmentEntity.create(props);
    await this.assignmentRepo.save(newAssignment);

    // Emit specialized events based on reason
    const eventPayload = { assignmentId: newAssignment.id, membershipId, timestamp: now };
    
    switch (dto.reason) {
      case EmploymentTransitionReason.PROMOTION:
        eventBus.emit('assignment.promoted', { ...eventPayload, previousDesignationId: activeAssignment.designationId || undefined, newDesignationId: newContext.designationId || undefined });
        break;
      case EmploymentTransitionReason.TRANSFER:
        eventBus.emit('assignment.transferred', eventPayload);
        break;
      case EmploymentTransitionReason.DEPARTMENT_CHANGE:
        eventBus.emit('assignment.department_changed', eventPayload);
        break;
      case EmploymentTransitionReason.BRANCH_CHANGE:
        eventBus.emit('assignment.branch_changed', eventPayload);
        break;
      case EmploymentTransitionReason.TEAM_CHANGE:
        eventBus.emit('assignment.team_changed', eventPayload);
        break;
      case EmploymentTransitionReason.DESIGNATION_CHANGE:
        eventBus.emit('assignment.designation_changed', eventPayload);
        break;
      case EmploymentTransitionReason.EMPLOYMENT_TYPE_CHANGE:
      case EmploymentTransitionReason.MARKETPLACE_CONVERSION:
        eventBus.emit('assignment.employment_type_changed', eventPayload);
        break;
      default:
        // No explicit event for REHIRE or RETURN_FROM_LEAVE requested, but assignment.created fits.
        eventBus.emit('assignment.created', eventPayload);
    }

    return { ...newAssignment.toJSON() };
  }
}

