import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { Reservation, ReservationStatus } from '../Reservation';
import { DomainException } from '../../exceptions/DomainException';

describe('Reservation Aggregate', () => {
  it('should initialize PENDING', () => {
    const r = new Reservation('R1', 'W1', 'D1', new Date());
    assert.strictEqual(r.getStatus(), ReservationStatus.PENDING);
  });

  it('should grant and convert to assignment', () => {
    const r = new Reservation('R1', 'W1', 'D1', new Date());
    r.grant();
    assert.strictEqual(r.getStatus(), ReservationStatus.GRANTED);
    
    r.convertToAssignment();
    assert.strictEqual(r.getStatus(), ReservationStatus.CONVERTED);
  });

  it('should expire if past TTL', () => {
    const expires = new Date(Date.now() - 1000); // Past
    const r = new Reservation('R1', 'W1', 'D1', expires);
    r.expire(new Date());
    assert.strictEqual(r.getStatus(), ReservationStatus.EXPIRED);
  });
});
