import { DomainException } from '../exceptions/DomainException';
import { CorrectionApprovedEvent, CorrectionRejectedEvent } from '../events/AttendanceCorrectionEvents';

export enum ApprovalState {
  WAITING = 'WAITING',
  L1_PENDING = 'L1_PENDING',
  L2_PENDING = 'L2_PENDING',
  L3_PENDING = 'L3_PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ESCALATED = 'ESCALATED'
}

export interface ApprovalRule {
  level: number;
  role: string;
  autoApprove?: boolean;
}

export class ApprovalPolicy {
  constructor(
    public readonly rules: ApprovalRule[],
    public readonly escalationPath: string
  ) {}
}

export class ApprovalStep {
  constructor(
    public readonly level: number,
    public status: 'PENDING' | 'APPROVED' | 'REJECTED',
    public approverId?: string,
    public comments?: string,
    public resolvedAt?: Date
  ) {}
}

export class ApprovalWorkflow {
  private state: ApprovalState = ApprovalState.WAITING;
  private readonly steps: ApprovalStep[] = [];
  private currentLevel: number = 1;
  private uncommittedEvents: any[] = [];

  constructor(
    public readonly id: string,
    public readonly referenceAggregateId: string, // The correction request ID
    public readonly policy: ApprovalPolicy
  ) {}

  public initialize(): void {
    if (this.state !== ApprovalState.WAITING) {
      throw new DomainException('INVALID_STATE', 'Workflow already initialized.');
    }

    const currentRule = this.policy.rules.find(r => r.level === this.currentLevel);
    
    if (!currentRule) {
      this.markApproved('System', 'No approval rules defined; auto-approved.');
      return;
    }

    if (currentRule.autoApprove) {
      this.markApproved('AutoApprovePolicy', 'Automatically approved by policy.');
      return;
    }

    this.state = this.getPendingStateForLevel(this.currentLevel);
    this.steps.push(new ApprovalStep(this.currentLevel, 'PENDING'));
  }

  public approve(approverId: string, comments?: string): void {
    if (!this.isPending()) {
      throw new DomainException('INVALID_STATE', 'Workflow is not in a pending state.');
    }

    const currentStep = this.getCurrentStep();
    if (currentStep) {
      currentStep.status = 'APPROVED';
      currentStep.approverId = approverId;
      currentStep.comments = comments;
      currentStep.resolvedAt = new Date();
    }

    // Check if there is a next level
    this.currentLevel++;
    const nextRule = this.policy.rules.find(r => r.level === this.currentLevel);

    if (nextRule) {
      this.state = this.getPendingStateForLevel(this.currentLevel);
      this.steps.push(new ApprovalStep(this.currentLevel, 'PENDING'));
    } else {
      this.markApproved(approverId, comments);
    }
  }

  public reject(rejectorId: string, comments?: string): void {
    if (!this.isPending()) {
      throw new DomainException('INVALID_STATE', 'Workflow is not in a pending state.');
    }

    const currentStep = this.getCurrentStep();
    if (currentStep) {
      currentStep.status = 'REJECTED';
      currentStep.approverId = rejectorId;
      currentStep.comments = comments;
      currentStep.resolvedAt = new Date();
    }

    this.state = ApprovalState.REJECTED;
    this.addUncommittedEvent({
      eventId: crypto.randomUUID(),
      aggregateId: this.id,
      eventType: 'CorrectionRejected',
      payload: {
        referenceAggregateId: this.referenceAggregateId,
        workflowId: this.id,
        rejectorId,
        comments
      },
      recordedAt: new Date()
    } as CorrectionRejectedEvent);
  }

  public escalate(): void {
    if (!this.isPending()) {
      throw new DomainException('INVALID_STATE', 'Workflow is not in a pending state.');
    }
    this.state = ApprovalState.ESCALATED;
  }

  private markApproved(approverId: string, comments?: string): void {
    this.state = ApprovalState.APPROVED;
    this.addUncommittedEvent({
      eventId: crypto.randomUUID(),
      aggregateId: this.id,
      eventType: 'CorrectionApproved',
      payload: {
        referenceAggregateId: this.referenceAggregateId,
        workflowId: this.id,
        approverId,
        comments,
        approvalLevel: this.currentLevel - 1 // The level that gave final approval
      },
      recordedAt: new Date()
    } as CorrectionApprovedEvent);
  }

  private getPendingStateForLevel(level: number): ApprovalState {
    switch (level) {
      case 1: return ApprovalState.L1_PENDING;
      case 2: return ApprovalState.L2_PENDING;
      case 3: return ApprovalState.L3_PENDING;
      default: return ApprovalState.ESCALATED;
    }
  }

  private isPending(): boolean {
    return [
      ApprovalState.L1_PENDING,
      ApprovalState.L2_PENDING,
      ApprovalState.L3_PENDING
    ].includes(this.state);
  }

  private getCurrentStep(): ApprovalStep | undefined {
    return this.steps.find(s => s.level === this.currentLevel && s.status === 'PENDING');
  }

  public getState(): ApprovalState {
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
