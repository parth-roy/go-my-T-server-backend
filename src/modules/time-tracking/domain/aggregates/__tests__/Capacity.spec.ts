import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { Capacity } from '../Capacity';
import { DomainException } from '../../exceptions/DomainException';

describe('Capacity Aggregate', () => {
  it('should track consumption', () => {
    const c = new Capacity('W1', 10);
    c.consume(4);
    assert.strictEqual(c.getRemainingHours(), 6);
    assert.strictEqual(c.getFatigueScore(), 6); // 4 * 1.5
  });

  it('should throw if exceeding capacity', () => {
    const c = new Capacity('W1', 10);
    c.consume(8);
    assert.throws(() => c.consume(3), DomainException);
  });

  it('should reset nightly and decay fatigue', () => {
    const c = new Capacity('W1', 10, 8, 20);
    c.resetNightly();
    assert.strictEqual(c.getRemainingHours(), 10);
    assert.strictEqual(c.getFatigueScore(), 10); // 20 - 10
  });
});
