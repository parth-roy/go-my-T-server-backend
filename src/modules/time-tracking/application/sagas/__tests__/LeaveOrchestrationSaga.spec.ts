import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { LeaveOrchestrationSaga } from '../LeaveOrchestrationSaga';
import { LeaveApprovedEvent } from '../../../domain/events/LeaveEvents';

describe('LeaveOrchestrationSaga', () => {
  it('should process LeaveApprovedEvent and emit recalculation event', async () => {
    const saga = new LeaveOrchestrationSaga();
    const event: LeaveApprovedEvent = {
      eventVersion: 'v1',
      schemaVersion: 'v1',
      aggregateVersion: 'v1',
      policyVersion: 'v1',
      correlationId: 'c1',
      causationId: 'c1',
      recordedAt: new Date(),
      eventType: 'LeaveApproved',
      aggregateId: 'L1',
      payload: {
        workerId: 'W1',
        leaveTypeId: 'LT1',
        approvedBy: 'M1'
      }
    };

    await assert.doesNotReject(saga.handleLeaveApproved(event));
  });
});
