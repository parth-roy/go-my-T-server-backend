import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { GracePolicy, GracePolicyRules } from '../GracePolicy';

describe('GracePolicy', () => {
  const policy = new GracePolicy();

  it('should calculate 0 late and early minutes when exactly on time', () => {
    const rules: GracePolicyRules = { allowedLateMinutes: 15, allowedEarlyMinutes: 15 };
    const scheduled = new Date('2026-08-01T09:00:00Z');
    const punch = new Date('2026-08-01T09:00:00Z');

    const result = policy.evaluate(scheduled, punch, rules);

    assert.strictEqual(result.lateMinutes, 0);
    assert.strictEqual(result.earlyMinutes, 0);
    assert.strictEqual(result.isWithinGrace, true);
    assert.strictEqual(result.isGraceApplied, false); // Grace wasn't needed
  });

  it('should mark as within grace if late punch is within threshold', () => {
    const rules: GracePolicyRules = { allowedLateMinutes: 15, allowedEarlyMinutes: 15 };
    const scheduled = new Date('2026-08-01T09:00:00Z');
    const punch = new Date('2026-08-01T09:10:00Z'); // 10 minutes late

    const result = policy.evaluate(scheduled, punch, rules);

    assert.strictEqual(result.lateMinutes, 10);
    assert.strictEqual(result.earlyMinutes, 0);
    assert.strictEqual(result.isWithinGrace, true);
    assert.strictEqual(result.isGraceApplied, true);
  });

  it('should mark outside grace if late punch exceeds threshold', () => {
    const rules: GracePolicyRules = { allowedLateMinutes: 15, allowedEarlyMinutes: 15 };
    const scheduled = new Date('2026-08-01T09:00:00Z');
    const punch = new Date('2026-08-01T09:20:00Z'); // 20 minutes late

    const result = policy.evaluate(scheduled, punch, rules);

    assert.strictEqual(result.lateMinutes, 20);
    assert.strictEqual(result.earlyMinutes, 0);
    assert.strictEqual(result.isWithinGrace, false);
    assert.strictEqual(result.isGraceApplied, false);
  });

  it('should handle early punches similarly based on early rules', () => {
    const rules: GracePolicyRules = { allowedLateMinutes: 15, allowedEarlyMinutes: 5 };
    const scheduled = new Date('2026-08-01T09:00:00Z');
    const punch = new Date('2026-08-01T08:50:00Z'); // 10 minutes early

    const result = policy.evaluate(scheduled, punch, rules);

    assert.strictEqual(result.lateMinutes, 0);
    assert.strictEqual(result.earlyMinutes, 10);
    assert.strictEqual(result.isWithinGrace, false);
    assert.strictEqual(result.isGraceApplied, false);
  });
});
