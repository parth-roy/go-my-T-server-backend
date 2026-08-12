import { EmploymentTransitionReason } from '../../domain/enums/employment-transition-reason.enum';

export interface AssignmentTimelineEntry {
  assignmentId: string;
  assignmentNumber: string;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  
  transitionReason: EmploymentTransitionReason;
  transitionSource?: string;
  
  // Snapshots
  employmentTypeName: string;
  designationName?: string | null;
  branchName?: string | null;
  departmentName?: string | null;
  teamName?: string | null;
  
  // Normalized Title (e.g. "Joined as Junior Dev" or "Promoted to Senior Dev")
  timelineTitle: string;
}

