export interface AssignmentSnapshotProps {
  assignmentId: string;
  assignmentNumber: string;
  assignmentVersion: number;
  membershipId: string;
  employmentTypeId?: string;
  designationId?: string;
  departmentId?: string;
  teamId?: string;
  branchId?: string;
  organizationId: string;
}

export class AssignmentSnapshotVO {
  constructor(private props: AssignmentSnapshotProps) {}
  get assignmentId(): string { return this.props.assignmentId; }
  get assignmentNumber(): string { return this.props.assignmentNumber; }
  get assignmentVersion(): number { return this.props.assignmentVersion; }
  toJSON() { return this.props; }
}

export interface ScheduleSnapshotProps {
  templateVersionId: string;
  templateVersionNumber: number;
  templateCode: string;
  templateName: string;
  workingHours: {
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    expectedDurationMinutes: number;
    isCrossMidnight: boolean;
  };
  breakRules: any[];
  graceRules: any;
  timezone: string;
}

export class ScheduleSnapshotVO {
  constructor(private props: ScheduleSnapshotProps) {}
  get workingHours() { return this.props.workingHours; }
  get timezone(): string { return this.props.timezone; }
  toJSON() { return this.props; }
}
