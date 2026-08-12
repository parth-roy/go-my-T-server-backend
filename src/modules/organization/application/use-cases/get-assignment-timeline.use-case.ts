import { IEmploymentAssignmentRepository } from '../../domain/repositories/employment-assignment.repository.interface';
import { AppError } from '@shared/errors/AppError';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { RequestContext } from '@shared/context/request-context';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { AssignmentTimelineEntry } from '../dtos/assignment-timeline.dto';
import { EmploymentTransitionReason } from '../../domain/enums/employment-transition-reason.enum';

export class GetAssignmentTimelineUseCase {
  constructor(
    private readonly assignmentRepo: IEmploymentAssignmentRepository
  ) {}

  async execute(context: RequestContext, membershipId: string): Promise<AssignmentTimelineEntry[]> {
    const caps = CapabilityResolver.resolve(context.platformIdentity.role as any);
    MembershipPolicy.assertCapability(caps, 'VIEW_EMPLOYMENT_HISTORY');
    
    // In a real application, ensure membership belongs to context.organization.id

    const assignments = await this.assignmentRepo.listByMembershipId(membershipId);
    
    // Sort chronologically ascending
    const chronological = assignments.sort((a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime());

    return chronological.map(assignment => {
      let timelineTitle = 'Transitioned';
      const reason = assignment.transitionMetadata.reason;

      switch (reason) {
        case EmploymentTransitionReason.NEW_HIRE:
          timelineTitle = `Joined as ${assignment.designationNameSnapshot || assignment.employmentTypeNameSnapshot}`;
          break;
        case EmploymentTransitionReason.PROMOTION:
          timelineTitle = `Promoted to ${assignment.designationNameSnapshot}`;
          break;
        case EmploymentTransitionReason.TRANSFER:
        case EmploymentTransitionReason.DEPARTMENT_CHANGE:
        case EmploymentTransitionReason.BRANCH_CHANGE:
        case EmploymentTransitionReason.TEAM_CHANGE:
          timelineTitle = `Transferred to ${assignment.departmentNameSnapshot || assignment.branchNameSnapshot || 'new role'}`;
          break;
        case EmploymentTransitionReason.TERMINATION:
          timelineTitle = `Employment Terminated`;
          break;
        case EmploymentTransitionReason.MARKETPLACE_CONVERSION:
          timelineTitle = `Converted to ${assignment.employmentTypeNameSnapshot}`;
          break;
        default:
          timelineTitle = `${reason.replace(/_/g, ' ').toLowerCase()} updated`;
      }

      return {
        assignmentId: assignment.id,
        assignmentNumber: assignment.assignmentNumber,
        effectiveFrom: assignment.effectiveFrom,
        effectiveUntil: assignment.effectiveUntil,
        transitionReason: reason,
        transitionSource: assignment.transitionMetadata.source,
        employmentTypeName: assignment.employmentTypeNameSnapshot,
        designationName: assignment.designationNameSnapshot,
        branchName: assignment.branchNameSnapshot,
        departmentName: assignment.departmentNameSnapshot,
        teamName: assignment.teamNameSnapshot,
        timelineTitle
      };
    });
  }
}

