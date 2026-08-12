import { ShiftOverrideStatus } from '@prisma/client';

export interface ShiftOverrideProps {
  id: string;
  shiftId: string;
  status: ShiftOverrideStatus;
  overrideStartTime?: Date;
  overrideEndTime?: Date;
  reason: string;
  requestedBy: string;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ShiftOverrideEntity {
  private constructor(private props: ShiftOverrideProps) {}

  get id(): string { return this.props.id; }
  get shiftId(): string { return this.props.shiftId; }
  get status(): ShiftOverrideStatus { return this.props.status; }
  get overrideStartTime(): Date | undefined { return this.props.overrideStartTime; }
  get overrideEndTime(): Date | undefined { return this.props.overrideEndTime; }
  get reason(): string { return this.props.reason; }
  get requestedBy(): string { return this.props.requestedBy; }
  get approvedBy(): string | undefined { return this.props.approvedBy; }

  toJSON() { return this.props; }

  public approve(approverId: string): void {
    if (this.props.status !== ShiftOverrideStatus.PENDING) {
      throw new Error('Can only approve PENDING overrides');
    }
    this.props.status = ShiftOverrideStatus.APPROVED;
    this.props.approvedBy = approverId;
    this.props.updatedAt = new Date();
  }

  public reject(rejectorId: string): void {
    if (this.props.status !== ShiftOverrideStatus.PENDING) {
      throw new Error('Can only reject PENDING overrides');
    }
    this.props.status = ShiftOverrideStatus.REJECTED;
    this.props.approvedBy = rejectorId; // store the rejector
    this.props.updatedAt = new Date();
  }

  public static create(props: ShiftOverrideProps): ShiftOverrideEntity {
    return new ShiftOverrideEntity(props);
  }

  public static reconstitute(props: ShiftOverrideProps): ShiftOverrideEntity {
    return new ShiftOverrideEntity(props);
  }
}
