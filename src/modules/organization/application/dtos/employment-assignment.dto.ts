import { EmploymentAssignmentStatus,  } from '@prisma/client';
import { EmploymentTransitionReason } from '../../domain/enums/employment-transition-reason.enum';
import { TransitionMetadata } from '../../domain/entities/employment-assignment.entity';

export interface CreateEmploymentAssignmentDto {
  membershipId: string;
  employmentTypeId: string;
  designationId?: string;
  branchId?: string;
  departmentId?: string;
  teamId?: string;
  effectiveFrom?: Date;
  metadata?: Partial<TransitionMetadata>;
}

export interface TransitionEmploymentAssignmentDto {
  reason: EmploymentTransitionReason;
  employmentTypeId?: string;
  designationId?: string;
  branchId?: string;
  departmentId?: string;
  teamId?: string;
  effectiveFrom?: Date;
  metadata?: Partial<TransitionMetadata>;
}

export interface EmploymentAssignmentResponseDto {
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

