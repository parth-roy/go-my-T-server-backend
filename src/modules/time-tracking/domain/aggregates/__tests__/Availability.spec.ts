import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { Availability, AvailabilityStatus } from '../Availability';
import { DomainException } from '../../exceptions/DomainException';

describe('Availability Aggregate', () => {
  it('should initialize OFF_DUTY', () => {
    const a = new Availability('W1');
    assert.strictEqual(a.getStatus(), AvailabilityStatus.OFF_DUTY);
  });

  it('should become AVAILABLE and update version', () => {
    const a = new Availability('W1');
    a.makeAvailable([]);
    assert.strictEqual(a.getStatus(), AvailabilityStatus.AVAILABLE);
    assert.strictEqual(a.getVersion(), 2);
  });

  it('should allow reservation when AVAILABLE', () => {
    const a = new Availability('W1', AvailabilityStatus.AVAILABLE);
    a.reserve();
    assert.strictEqual(a.getStatus(), AvailabilityStatus.RESERVED);
  });

  it('should throw if reserving when OFF_DUTY', () => {
    const a = new Availability('W1', AvailabilityStatus.OFF_DUTY);
    assert.throws(() => a.reserve(), DomainException);
  });

  it('should accept work when RESERVED', () => {
    const a = new Availability('W1', AvailabilityStatus.RESERVED);
    a.assignWork();
    assert.strictEqual(a.getStatus(), AvailabilityStatus.BUSY);
  });
});
