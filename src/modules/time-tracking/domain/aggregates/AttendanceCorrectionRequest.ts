import { EvidenceReference } from '../value-objects/EvidenceReference';
import { CorrectionRequestState, CorrectionType, CorrectionSubmittedEvent, CorrectionCancelledEvent } from '../events/AttendanceCorrectionEvents';
import { DomainException } from '../exceptions/DomainException';

export class CorrectionRevision {
  constructor(
    public readonly revisionNumber: number,
    public readonly proposedChanges: Record<string, any>,
    public readonly reason: string,
    public readonly policySnapshot: {
      approvalPolicyVersion: string;
      organizationPolicyVersion: string;
    }
  ) {}
}

export class AttendanceCorrectionRequest {
  private state: CorrectionRequestState = CorrectionRequestState.DRAFT;
  private readonly revisions: CorrectionRevision[] = [];
  private readonly evidence: EvidenceReference[] = [];
  private uncommittedEvents: any[] = [];

  constructor(
    public readonly id: string,
    public readonly workerId: string,
    public readonly organizationId: string,
    public readonly targetDate: Date,
    public readonly type: CorrectionType
  ) {}

  public submitRevision(
    proposedChanges: Record<string, any>,
    reason: string,
    evidence: EvidenceReference[],
    policySnapshot: { approvalPolicyVersion: string; organizationPolicyVersion: string }
  ): void {
    if (this.state === CorrectionRequestState.PROCESSED) {
      throw new DomainException('INVALID_STATE', 'Cannot modify a processed correction request.');
    }
    
    if (this.state === CorrectionRequestState.UNDER_REVIEW) {
      this.cancelCurrentRevision('New revision submitted');
    }

    const nextRevisionNumber = this.revisions.length + 1;
    const revision = new CorrectionRevision(nextRevisionNumber, proposedChanges, reason, policySnapshot);
    
    this.revisions.push(revision);
    this.evidence.push(...evidence);
    
    this.state = CorrectionRequestState.SUBMITTED;

    this.addUncommittedEvent({
      eventId: crypto.randomUUID(),
      aggregateId: this.id,
      eventType: 'CorrectionSubmitted',
      payload: {
        workerId: this.workerId,
        organizationId: this.organizationId,
        targetDate: this.targetDate,
        type: this.type,
        revisionNumber: nextRevisionNumber,
        proposedChanges,
        reason,
        evidence,
        policySnapshot
      },
      recordedAt: new Date()
    } as CorrectionSubmittedEvent);
  }

  public beginReview(): void {
    if (this.state !== CorrectionRequestState.SUBMITTED) {
      throw new DomainException('INVALID_STATE', 'Only submitted requests can enter review.');
    }
    this.state = CorrectionRequestState.UNDER_REVIEW;
  }

  public markApproved(): void {
    if (this.state !== CorrectionRequestState.UNDER_REVIEW) {
      throw new DomainException('INVALID_STATE', 'Request must be under review to be approved.');
    }
    this.state = CorrectionRequestState.APPROVED;
  }

  public markRejected(): void {
    if (this.state !== CorrectionRequestState.UNDER_REVIEW) {
      throw new DomainException('INVALID_STATE', 'Request must be under review to be rejected.');
    }
    this.state = CorrectionRequestState.REJECTED;
  }

  public markProcessed(): void {
    if (this.state !== CorrectionRequestState.APPROVED) {
      throw new DomainException('INVALID_STATE', 'Request must be approved to be processed.');
    }
    this.state = CorrectionRequestState.PROCESSED;
  }

  public withdraw(): void {
    if (this.state !== CorrectionRequestState.DRAFT && this.state !== CorrectionRequestState.SUBMITTED) {
      throw new DomainException('INVALID_STATE', 'Can only withdraw draft or submitted requests.');
    }
    this.state = CorrectionRequestState.WITHDRAWN;
  }

  private cancelCurrentRevision(reason: string): void {
    this.state = CorrectionRequestState.CANCELLED;
    this.addUncommittedEvent({
      eventId: crypto.randomUUID(),
      aggregateId: this.id,
      eventType: 'CorrectionCancelled',
      payload: {
        reason,
        revisionNumber: this.getCurrentRevision()?.revisionNumber || 0
      },
      recordedAt: new Date()
    } as CorrectionCancelledEvent);
  }

  public getCurrentRevision(): CorrectionRevision | undefined {
    return this.revisions[this.revisions.length - 1];
  }

  public getState(): CorrectionRequestState {
    return this.state;
  }

  public getUncommittedEvents(): any[] {
    return this.uncommittedEvents;
  }

  public clearEvents(): void {
    this.uncommittedEvents = [];
  }

  private addUncommittedEvent(event: any): void {
    this.uncommittedEvents.push(event);
  }
}
