import { EmploymentAssignmentStatus,  } from '@prisma/client';
import { EmploymentTransitionReason } from '../enums/employment-transition-reason.enum';
import { AppError } from '@shared/errors/AppError';

export interface TransitionMetadata {
  reason: EmploymentTransitionReason;
  requestedBy?: string;
  approvedBy?: string;
  notes?: string;
  source?: string;
  ticketId?: string;
  previousAssignmentId?: string;
}

export interface EmploymentAssignmentProps {
  id: string;
  assignmentNumber: string;
  membershipId: string;
  
  employmentTypeId: string;
  employmentTypeNameSnapshot: string;
  
  designationId?: string | null;
  designationNameSnapshot?: string | null;
  
  branchId?: string | null;
  branchNameSnapshot?: string | null;
  
  departmentId?: string | null;
  departmentNameSnapshot?: string | null;
  
  teamId?: string | null;
  teamNameSnapshot?: string | null;
  
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  
  status: EmploymentAssignmentStatus;
  transitionMetadata: TransitionMetadata;
  
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class EmploymentAssignmentEntity {
  private props: EmploymentAssignmentProps;

  private constructor(props: EmploymentAssignmentProps) {
    this.props = { ...props };
  }

  static create(props: EmploymentAssignmentProps): EmploymentAssignmentEntity {
    return new EmploymentAssignmentEntity(props);
  }

  static reconstitute(props: EmploymentAssignmentProps): EmploymentAssignmentEntity {
    return new EmploymentAssignmentEntity(props);
  }

  get id(): string { return this.props.id; }
  get assignmentNumber(): string { return this.props.assignmentNumber; }
  get membershipId(): string { return this.props.membershipId; }
  
  get employmentTypeId(): string { return this.props.employmentTypeId; }
  get employmentTypeNameSnapshot(): string { return this.props.employmentTypeNameSnapshot; }
  
  get designationId(): string | null | undefined { return this.props.designationId; }
  get designationNameSnapshot(): string | null | undefined { return this.props.designationNameSnapshot; }
  
  get branchId(): string | null | undefined { return this.props.branchId; }
  get branchNameSnapshot(): string | null | undefined { return this.props.branchNameSnapshot; }
  
  get departmentId(): string | null | undefined { return this.props.departmentId; }
  get departmentNameSnapshot(): string | null | undefined { return this.props.departmentNameSnapshot; }
  
  get teamId(): string | null | undefined { return this.props.teamId; }
  get teamNameSnapshot(): string | null | undefined { return this.props.teamNameSnapshot; }
  
  get effectiveFrom(): Date { return this.props.effectiveFrom; }
  get effectiveUntil(): Date | null { return this.props.effectiveUntil; }
  get status(): EmploymentAssignmentStatus { return this.props.status; }
  get transitionMetadata(): TransitionMetadata { return this.props.transitionMetadata; }
  
  get version(): number { return this.props.version; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  terminate(now: Date = new Date(), metadata?: Partial<TransitionMetadata>): void {
    if (this.props.status === EmploymentAssignmentStatus.TERMINATED) {
      throw AppError.badRequest('Assignment is already terminated');
    }
    
    this.props.status = EmploymentAssignmentStatus.TERMINATED;
    this.props.effectiveUntil = now;
    if (metadata) {
      this.props.transitionMetadata = { ...this.props.transitionMetadata, ...metadata };
    }
    this.props.updatedAt = now;
    this.props.version += 1;
  }

  toJSON(): EmploymentAssignmentProps {
    return { ...this.props };
  }
}

