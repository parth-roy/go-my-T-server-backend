import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { LeaveAvailabilityPolicy } from '../LeaveAvailabilityPolicy';

describe('LeaveAvailabilityPolicy', () => {
  it('should return true when no conflicts exist', () => {
    const policy = new LeaveAvailabilityPolicy();
    const start = new Date('2026-08-10T00:00:00Z');
    const end = new Date('2026-08-11T00:00:00Z');
    
    assert.strictEqual(policy.validateAvailability(start, end, [], false, false), true);
  });

  it('should return false on attendance conflict', () => {
    const policy = new LeaveAvailabilityPolicy();
    const start = new Date('2026-08-10T00:00:00Z');
    const end = new Date('2026-08-11T00:00:00Z');
    
    assert.strictEqual(policy.validateAvailability(start, end, [], true, false), false);
  });

  it('should return false on shift conflict', () => {
    const policy = new LeaveAvailabilityPolicy();
    const start = new Date('2026-08-10T00:00:00Z');
    const end = new Date('2026-08-11T00:00:00Z');
    
    assert.strictEqual(policy.validateAvailability(start, end, [], false, true), false);
  });

  it('should return false on overlapping approved leave', () => {
    const policy = new LeaveAvailabilityPolicy();
    const start = new Date('2026-08-10T00:00:00Z');
    const end = new Date('2026-08-11T00:00:00Z');
    
    const existing = [
      { start: new Date('2026-08-09T00:00:00Z'), end: new Date('2026-08-10T12:00:00Z'), status: 'APPROVED' }
    ];
    
    assert.strictEqual(policy.validateAvailability(start, end, existing, false, false), false);
  });
});
