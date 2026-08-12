import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { AttendanceCorrectionRequest } from '../aggregates/AttendanceCorrectionRequest';
import { CorrectionRequestState, CorrectionType } from '../events/AttendanceCorrectionEvents';
import { DomainException } from '../exceptions/DomainException';
import { ManagerNoteEvidence } from '../value-objects/EvidenceReference';

describe('AttendanceCorrectionRequest', () => {
  it('should initialize in DRAFT state', () => {
    const req = new AttendanceCorrectionRequest('req-1', 'w-1', 'org-1', new Date(), CorrectionType.MISSED_PUNCH_IN);
    assert.strictEqual(req.getState(), CorrectionRequestState.DRAFT);
  });

  it('should transition to SUBMITTED and create a revision upon submission', () => {
    const req = new AttendanceCorrectionRequest('req-1', 'w-1', 'org-1', new Date(), CorrectionType.MISSED_PUNCH_IN);
    const evidence = [new ManagerNoteEvidence('Forgot to punch', 'm-1')];
    
    req.submitRevision({ newTime: new Date() }, 'Forgot', evidence, { approvalPolicyVersion: '1', organizationPolicyVersion: '1' });
    
    assert.strictEqual(req.getState(), CorrectionRequestState.SUBMITTED);
    assert.strictEqual(req.getCurrentRevision()?.revisionNumber, 1);
    assert.strictEqual(req.getUncommittedEvents().length, 1);
    assert.strictEqual(req.getUncommittedEvents()[0].eventType, 'CorrectionSubmitted');
  });

  it('should cancel current revision when submitting a new revision while UNDER_REVIEW', () => {
    const req = new AttendanceCorrectionRequest('req-1', 'w-1', 'org-1', new Date(), CorrectionType.MISSED_PUNCH_IN);
    req.submitRevision({ newTime: new Date() }, 'Forgot', [], { approvalPolicyVersion: '1', organizationPolicyVersion: '1' });
    req.beginReview();
    assert.strictEqual(req.getState(), CorrectionRequestState.UNDER_REVIEW);
    
    req.clearEvents();

    req.submitRevision({ newTime: new Date() }, 'Update', [], { approvalPolicyVersion: '1', organizationPolicyVersion: '1' });
    
    assert.strictEqual(req.getState(), CorrectionRequestState.SUBMITTED);
    assert.strictEqual(req.getCurrentRevision()?.revisionNumber, 2);
    assert.strictEqual(req.getUncommittedEvents().length, 2);
    assert.strictEqual(req.getUncommittedEvents()[0].eventType, 'CorrectionCancelled');
    assert.strictEqual(req.getUncommittedEvents()[1].eventType, 'CorrectionSubmitted');
  });

  it('should allow withdrawal from DRAFT or SUBMITTED', () => {
    let req = new AttendanceCorrectionRequest('req-1', 'w-1', 'org-1', new Date(), CorrectionType.MISSED_PUNCH_IN);
    req.withdraw();
    assert.strictEqual(req.getState(), CorrectionRequestState.WITHDRAWN);

    req = new AttendanceCorrectionRequest('req-2', 'w-1', 'org-1', new Date(), CorrectionType.MISSED_PUNCH_IN);
    req.submitRevision({}, 'reason', [], { approvalPolicyVersion: '1', organizationPolicyVersion: '1' });
    req.withdraw();
    assert.strictEqual(req.getState(), CorrectionRequestState.WITHDRAWN);
  });

  it('should transition through REVIEW to APPROVED', () => {
    const req = new AttendanceCorrectionRequest('req-1', 'w-1', 'org-1', new Date(), CorrectionType.MISSED_PUNCH_IN);
    req.submitRevision({}, 'reason', [], { approvalPolicyVersion: '1', organizationPolicyVersion: '1' });
    req.beginReview();
    req.markApproved();
    assert.strictEqual(req.getState(), CorrectionRequestState.APPROVED);
    req.markProcessed();
    assert.strictEqual(req.getState(), CorrectionRequestState.PROCESSED);
  });

  it('should throw DomainException if processing without approval', () => {
    const req = new AttendanceCorrectionRequest('req-1', 'w-1', 'org-1', new Date(), CorrectionType.MISSED_PUNCH_IN);
    req.submitRevision({}, 'reason', [], { approvalPolicyVersion: '1', organizationPolicyVersion: '1' });
    req.beginReview();
    assert.throws(() => req.markProcessed(), DomainException);
  });
});
