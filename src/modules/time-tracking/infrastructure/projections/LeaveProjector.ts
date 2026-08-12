import { LeaveBalanceDeductedEvent, LeaveBalanceAccruedEvent, LeaveBalanceRefundedEvent } from '../../domain/events/LeaveEvents';

export class LeaveProjector {
  
  public async onLeaveBalanceAccrued(event: LeaveBalanceAccruedEvent): Promise<void> {
    // 1. Check idempotency (aggregateVersion / eventVersion)
    // 2. Upsert LeaveBalanceDashboard (increment balance and accrued)
    // 3. Insert LeaveAuditTimeline
    console.log(`[LeaveProjector] Projected Accrual for ${event.payload.workerId}`);
  }

  public async onLeaveBalanceDeducted(event: LeaveBalanceDeductedEvent): Promise<void> {
    // 1. Check idempotency
    // 2. Upsert LeaveBalanceDashboard (decrement balance, increment deducted)
    // 3. Insert LeaveAuditTimeline
    console.log(`[LeaveProjector] Projected Deduction for ${event.payload.workerId}`);
  }

  public async onLeaveBalanceRefunded(event: LeaveBalanceRefundedEvent): Promise<void> {
    // 1. Check idempotency
    // 2. Upsert LeaveBalanceDashboard (increment balance, decrement deducted)
    // 3. Insert LeaveAuditTimeline
    console.log(`[LeaveProjector] Projected Refund for ${event.payload.workerId}`);
  }
}
