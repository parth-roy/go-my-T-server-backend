import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { Holiday, HolidayType, HolidayStatus } from '../Holiday';
import { DomainException } from '../../exceptions/DomainException';

describe('Holiday Aggregate', () => {
  it('should create an active holiday', () => {
    const h = new Holiday('H1', 'C1', 'Test', HolidayType.ONE_TIME, new Date());
    assert.strictEqual(h.getStatus(), HolidayStatus.ACTIVE);
  });

  it('should revoke holiday and increment version', () => {
    const h = new Holiday('H1', 'C1', 'Test', HolidayType.ONE_TIME, new Date());
    h.revoke();
    assert.strictEqual(h.getStatus(), HolidayStatus.REVOKED);
    assert.strictEqual(h.getVersion(), 2);
  });

  it('should throw if revoking twice', () => {
    const h = new Holiday('H1', 'C1', 'Test', HolidayType.ONE_TIME, new Date());
    h.revoke();
    assert.throws(() => h.revoke(), DomainException);
  });
});
