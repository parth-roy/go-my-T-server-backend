import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { FatiguePolicy } from '../CapacityPolicies';
import { Capacity } from '../../aggregates/Capacity';

describe('FatiguePolicy', () => {
  const policy = new FatiguePolicy();

  it('should reject if already fatigued', () => {
    const c = new Capacity('W1', 100, 50, 105); // Above 100
    assert.strictEqual(policy.validateAssignment(c, 2), false);
  });

  it('should reject if projected assignment breaches critical threshold severely', () => {
    const c = new Capacity('W1', 100, 50, 95); 
    // 95 + (20 * 1.5) = 125, which is > 120 (Threshold + 20)
    assert.strictEqual(policy.validateAssignment(c, 20), false);
  });

  it('should accept if under threshold', () => {
    const c = new Capacity('W1', 100, 50, 50); 
    assert.strictEqual(policy.validateAssignment(c, 10), true);
  });
});
