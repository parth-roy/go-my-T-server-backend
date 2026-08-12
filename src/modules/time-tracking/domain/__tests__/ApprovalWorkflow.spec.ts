import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { ApprovalWorkflow, ApprovalPolicy, ApprovalRule, ApprovalState } from '../aggregates/ApprovalWorkflow';
import { DomainException } from '../exceptions/DomainException';

describe('ApprovalWorkflow', () => {
  it('should auto-approve if policy dictates', () => {
    const policy = new ApprovalPolicy([{ level: 1, role: 'SYSTEM', autoApprove: true }], 'NONE');
    const workflow = new ApprovalWorkflow('wf-1', 'req-1', policy);

    workflow.initialize();
    
    assert.strictEqual(workflow.getState(), ApprovalState.APPROVED);
    assert.strictEqual(workflow.getUncommittedEvents()[0].eventType, 'CorrectionApproved');
  });

  it('should enter L1_PENDING and transition to APPROVED on L1 approval', () => {
    const policy = new ApprovalPolicy([{ level: 1, role: 'SUPERVISOR', autoApprove: false }], 'ESCALATE');
    const workflow = new ApprovalWorkflow('wf-1', 'req-1', policy);

    workflow.initialize();
    assert.strictEqual(workflow.getState(), ApprovalState.L1_PENDING);

    workflow.approve('manager-1', 'Looks good');
    
    assert.strictEqual(workflow.getState(), ApprovalState.APPROVED);
    assert.strictEqual(workflow.getUncommittedEvents().length, 1);
    assert.strictEqual(workflow.getUncommittedEvents()[0].payload.approverId, 'manager-1');
  });

  it('should transition to L2_PENDING after L1 if multi-level', () => {
    const policy = new ApprovalPolicy([
      { level: 1, role: 'SUPERVISOR', autoApprove: false },
      { level: 2, role: 'MANAGER', autoApprove: false }
    ], 'ESCALATE');
    const workflow = new ApprovalWorkflow('wf-1', 'req-1', policy);

    workflow.initialize();
    assert.strictEqual(workflow.getState(), ApprovalState.L1_PENDING);

    workflow.approve('supervisor-1');
    assert.strictEqual(workflow.getState(), ApprovalState.L2_PENDING);

    workflow.approve('manager-1');
    assert.strictEqual(workflow.getState(), ApprovalState.APPROVED);
  });

  it('should transition to REJECTED on rejection', () => {
    const policy = new ApprovalPolicy([{ level: 1, role: 'SUPERVISOR', autoApprove: false }], 'ESCALATE');
    const workflow = new ApprovalWorkflow('wf-1', 'req-1', policy);

    workflow.initialize();
    workflow.reject('manager-1', 'Invalid evidence');
    
    assert.strictEqual(workflow.getState(), ApprovalState.REJECTED);
    assert.strictEqual(workflow.getUncommittedEvents()[0].eventType, 'CorrectionRejected');
    assert.strictEqual(workflow.getUncommittedEvents()[0].payload.rejectorId, 'manager-1');
  });

  it('should prevent approval if not pending', () => {
    const policy = new ApprovalPolicy([{ level: 1, role: 'SYSTEM', autoApprove: true }], 'NONE');
    const workflow = new ApprovalWorkflow('wf-1', 'req-1', policy);

    workflow.initialize(); // Auto-approves
    assert.throws(() => workflow.approve('manager-1'), DomainException);
  });
});
