import { DomainException } from '../exceptions/DomainException';
import { LeaveSnapshot } from '../value-objects/LeaveSnapshot';

export enum LeaveRequestState {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  TAKEN = 'TAKEN',
  CANCELLED = 'CANCELLED'
}

export class LeaveRequest {
  private state: LeaveRequestState = LeaveRequestState.DRAFT;
  private aggregateVersion: number = 1;

  constructor(
    public readonly leaveRequestId: string,
    public readonly workerId: string,
    public readonly leaveTypeId: string,
    public readonly startDate: Date,
    public readonly endDate: Date,
    private snapshot: LeaveSnapshot
  ) {}

  public submit(): void {
    if (this.state !== LeaveRequestState.DRAFT) {
      throw new DomainException('INVALID_STATE', 'Only draft leaves can be submitted.');
    }
    this.state = LeaveRequestState.SUBMITTED;
    this.aggregateVersion++;
  }

  public beginReview(): void {
    if (this.state !== LeaveRequestState.SUBMITTED) {
      throw new DomainException('INVALID_STATE', 'Only submitted leaves can enter review.');
    }
    this.state = LeaveRequestState.UNDER_REVIEW;
    this.aggregateVersion++;
  }

  public approve(): void {
    if (this.state !== LeaveRequestState.UNDER_REVIEW) {
      throw new DomainException('INVALID_STATE', 'Leave must be under review to be approved.');
    }
    this.state = LeaveRequestState.APPROVED;
    this.aggregateVersion++;
  }

  public reject(): void {
    if (this.state !== LeaveRequestState.UNDER_REVIEW) {
      throw new DomainException('INVALID_STATE', 'Leave must be under review to be rejected.');
    }
    this.state = LeaveRequestState.REJECTED;
    this.aggregateVersion++;
  }

  public markTaken(): void {
    if (this.state !== LeaveRequestState.APPROVED) {
      throw new DomainException('INVALID_STATE', 'Only approved leaves can be taken.');
    }
    this.state = LeaveRequestState.TAKEN;
    this.aggregateVersion++;
  }

  public cancel(): void {
    if (this.state === LeaveRequestState.REJECTED || this.state === LeaveRequestState.CANCELLED) {
      throw new DomainException('INVALID_STATE', 'Cannot cancel a rejected or already cancelled leave.');
    }
    this.state = LeaveRequestState.CANCELLED;
    this.aggregateVersion++;
  }

  public getState(): LeaveRequestState { return this.state; }
  public getVersion(): number { return this.aggregateVersion; }
  public getSnapshot(): LeaveSnapshot { return this.snapshot; }
}
