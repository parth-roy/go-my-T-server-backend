import { ShiftLifecycleStatus } from '@prisma/client';
import { AssignmentSnapshotVO, ScheduleSnapshotVO } from '../value-objects/shift-snapshots.vo';

export interface ShiftInstanceProps {
  id: string;
  organizationId: string;
  membershipId: string;
  assignmentId: string;
  date: Date;
  status: ShiftLifecycleStatus;
  startTime: Date;
  endTime: Date;
  expectedDuration: number;
  scheduleSnapshot: ScheduleSnapshotVO;
  assignmentSnapshot: AssignmentSnapshotVO;
  createdAt: Date;
  updatedAt: Date;
}

export class ShiftInstanceEntity {
  private constructor(private props: ShiftInstanceProps) {}

  get id(): string { return this.props.id; }
  get organizationId(): string { return this.props.organizationId; }
  get membershipId(): string { return this.props.membershipId; }
  get date(): Date { return this.props.date; }
  get status(): ShiftLifecycleStatus { return this.props.status; }
  get startTime(): Date { return this.props.startTime; }
  get endTime(): Date { return this.props.endTime; }
  get scheduleSnapshot(): ScheduleSnapshotVO { return this.props.scheduleSnapshot; }
  get assignmentSnapshot(): AssignmentSnapshotVO { return this.props.assignmentSnapshot; }

  toJSON() { return this.props; }

  public publish(): void {
    if (this.props.status !== ShiftLifecycleStatus.DRAFT && this.props.status !== ShiftLifecycleStatus.GENERATED) {
      throw new Error('Can only publish DRAFT or GENERATED shifts');
    }
    this.props.status = ShiftLifecycleStatus.PUBLISHED;
    this.props.updatedAt = new Date();
  }

  public acknowledge(): void {
    if (this.props.status !== ShiftLifecycleStatus.PUBLISHED) {
      throw new Error('Can only acknowledge PUBLISHED shifts');
    }
    this.props.status = ShiftLifecycleStatus.ACKNOWLEDGED;
    this.props.updatedAt = new Date();
  }

  public startCheckIn(): void {
    if (this.props.status !== ShiftLifecycleStatus.ACKNOWLEDGED && this.props.status !== ShiftLifecycleStatus.PUBLISHED) {
      throw new Error('Can only start check-in on PUBLISHED or ACKNOWLEDGED shifts');
    }
    this.props.status = ShiftLifecycleStatus.CHECKIN_OPEN;
    this.props.updatedAt = new Date();
  }

  public checkIn(): void {
    if (this.props.status !== ShiftLifecycleStatus.CHECKIN_OPEN) {
      throw new Error('Check-in is not open for this shift');
    }
    this.props.status = ShiftLifecycleStatus.IN_PROGRESS;
    this.props.updatedAt = new Date();
  }

  public complete(): void {
    if (this.props.status !== ShiftLifecycleStatus.IN_PROGRESS && this.props.status !== ShiftLifecycleStatus.CHECKOUT_PENDING) {
      throw new Error('Shift must be in progress to complete');
    }
    this.props.status = ShiftLifecycleStatus.COMPLETED;
    this.props.updatedAt = new Date();
  }

  public cancel(): void {
    const cancelableStates: ShiftLifecycleStatus[] = [ShiftLifecycleStatus.DRAFT, ShiftLifecycleStatus.GENERATED, ShiftLifecycleStatus.PUBLISHED, ShiftLifecycleStatus.ACKNOWLEDGED];
    if (!cancelableStates.includes(this.props.status)) {
      throw new Error('Cannot cancel a shift that has started');
    }
    this.props.status = ShiftLifecycleStatus.CANCELLED;
    this.props.updatedAt = new Date();
  }

  public static create(props: ShiftInstanceProps): ShiftInstanceEntity {
    return new ShiftInstanceEntity(props);
  }

  public static reconstitute(props: ShiftInstanceProps): ShiftInstanceEntity {
    return new ShiftInstanceEntity(props);
  }
}
