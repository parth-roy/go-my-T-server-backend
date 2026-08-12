import { ScheduleTargetType, ScheduleAssignmentReason, EmploymentAssignmentStatus } from '@prisma/client';
import { AppError } from '@shared/errors/AppError';

export interface ScheduleAssignmentProps {
  id: string;
  organizationId: string;
  targetType: ScheduleTargetType;
  targetId: string;
  scheduleTemplateVersionId: string;
  reason: ScheduleAssignmentReason;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  status: EmploymentAssignmentStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ScheduleAssignmentEntity {
  private props: ScheduleAssignmentProps;

  private constructor(props: ScheduleAssignmentProps) {
    this.props = props;
  }

  static create(props: ScheduleAssignmentProps): ScheduleAssignmentEntity {
    return new ScheduleAssignmentEntity(props);
  }

  static reconstitute(props: ScheduleAssignmentProps): ScheduleAssignmentEntity {
    return new ScheduleAssignmentEntity(props);
  }

  get id(): string { return this.props.id; }
  get targetType(): ScheduleTargetType { return this.props.targetType; }
  get targetId(): string { return this.props.targetId; }
  get effectiveFrom(): Date { return this.props.effectiveFrom; }
  get effectiveUntil(): Date | null { return this.props.effectiveUntil; }
  get status(): EmploymentAssignmentStatus { return this.props.status; }
  get scheduleTemplateVersionId(): string { return this.props.scheduleTemplateVersionId; }

  public terminate(endDate: Date = new Date()): void {
    if (this.props.status !== EmploymentAssignmentStatus.ACTIVE) {
      throw AppError.badRequest('Cannot terminate a non-active schedule assignment');
    }
    this.props.effectiveUntil = endDate;
    this.props.status = EmploymentAssignmentStatus.TERMINATED;
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }

  toJSON() {
    return { ...this.props };
  }
}
