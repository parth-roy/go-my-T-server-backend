import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { PayPeriod, PayPeriodState } from '../PayPeriod';
import { DomainException } from '../../exceptions/DomainException';

describe('PayPeriod Aggregate', () => {
  it('should initialize in OPEN state', () => {
    const pp = new PayPeriod('pp-1', 'org-1', new Date(), new Date());
    assert.strictEqual(pp.getState(), PayPeriodState.OPEN);
  });

  it('should transition sequentially', () => {
    const pp = new PayPeriod('pp-1', 'org-1', new Date(), new Date());
    pp.closePeriod();
    assert.strictEqual(pp.getState(), PayPeriodState.PROCESSING);

    pp.finalizeClosure();
    assert.strictEqual(pp.getState(), PayPeriodState.CLOSED);

    pp.archive();
    assert.strictEqual(pp.getState(), PayPeriodState.ARCHIVED);
  });

  it('should throw DomainException on illegal transitions', () => {
    const pp = new PayPeriod('pp-1', 'org-1', new Date(), new Date());
    assert.throws(() => pp.finalizeClosure(), DomainException);
    assert.throws(() => pp.archive(), DomainException);
  });
});
