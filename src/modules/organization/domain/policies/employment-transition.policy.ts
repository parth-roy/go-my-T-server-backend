import { EmploymentAssignmentEntity, EmploymentAssignmentProps } from '../entities/employment-assignment.entity';
import { EmploymentTransitionReason } from '../enums/employment-transition-reason.enum';
import { AppError } from '@shared/errors/AppError';

export class EmploymentTransitionPolicy {
  public validateTransition(
    currentAssignment: EmploymentAssignmentEntity | null, 
    requestedReason: EmploymentTransitionReason, 
    newContext: Partial<EmploymentAssignmentProps>
  ): void {
    if (requestedReason === EmploymentTransitionReason.NEW_HIRE) {
      if (currentAssignment) {
        throw AppError.badRequest('Cannot process NEW_HIRE transition for a member who already has an active assignment.');
      }
      return;
    }

    if (!currentAssignment) {
      throw AppError.badRequest(`Cannot process ${requestedReason} transition without an active assignment.`);
    }

    switch (requestedReason) {
      case EmploymentTransitionReason.PROMOTION:
        // Assume Designation Level check happens here, but requires hydrated designation objects.
        // For policy isolation, we can just ensure designation changed.
        if (currentAssignment.designationId === newContext.designationId) {
          throw AppError.badRequest('Promotion must include a change in designation.');
        }
        break;

      case EmploymentTransitionReason.TRANSFER:
      case EmploymentTransitionReason.DEPARTMENT_CHANGE:
      case EmploymentTransitionReason.BRANCH_CHANGE:
      case EmploymentTransitionReason.TEAM_CHANGE:
        // Must have changed at least one placement dimension
        if (
          currentAssignment.departmentId === newContext.departmentId &&
          currentAssignment.branchId === newContext.branchId &&
          currentAssignment.teamId === newContext.teamId
        ) {
          throw AppError.badRequest('Transfer must include a change in branch, department, or team.');
        }
        break;

      case EmploymentTransitionReason.MARKETPLACE_CONVERSION:
        // Check if employment type changed (Gig to FTE context).
        if (currentAssignment.employmentTypeId === newContext.employmentTypeId) {
          throw AppError.badRequest('Marketplace conversion must involve a change in employment type.');
        }
        // In a real system, you would check `Wallet Settlement` here or in the orchestrator.
        break;

      case EmploymentTransitionReason.TERMINATION:
        // Validation for termination is handled implicitly by the orchestrator terminating the assignment
        break;

      default:
        // Basic fallback
        break;
    }
  }
}

