import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { LeaveRequest, LeaveRequestState } from '../LeaveRequest';
import { LeaveSnapshot } from '../../value-objects/LeaveSnapshot';
import { DomainException } from '../../exceptions/DomainException';

describe('LeaveRequest Aggregate', () => {
  const snapshot = new LeaveSnapshot('v1', 'v1', 'v1', 'v1', 'v1');

  it('should initialize in DRAFT state', () => {
    const request = new LeaveRequest('LR1', 'W1', 'LT1', new Date(), new Date(), snapshot);
    assert.strictEqual(request.getState(), LeaveRequestState.DRAFT);
  });

  it('should transition through approval lifecycle', () => {
    const request = new LeaveRequest('LR1', 'W1', 'LT1', new Date(), new Date(), snapshot);
    request.submit();
    assert.strictEqual(request.getState(), LeaveRequestState.SUBMITTED);
    
    request.beginReview();
    assert.strictEqual(request.getState(), LeaveRequestState.UNDER_REVIEW);

    request.approve();
    assert.strictEqual(request.getState(), LeaveRequestState.APPROVED);
    
    request.markTaken();
    assert.strictEqual(request.getState(), LeaveRequestState.TAKEN);
  });

  it('should allow cancellation from APPROVED or TAKEN', () => {
    const request = new LeaveRequest('LR1', 'W1', 'LT1', new Date(), new Date(), snapshot);
    request.submit();
    request.beginReview();
    request.approve();
    request.cancel();
    assert.strictEqual(request.getState(), LeaveRequestState.CANCELLED);
  });

  it('should throw DomainException on illegal transitions', () => {
    const request = new LeaveRequest('LR1', 'W1', 'LT1', new Date(), new Date(), snapshot);
    assert.throws(() => request.approve(), DomainException); // Cannot approve DRAFT
  });
});
