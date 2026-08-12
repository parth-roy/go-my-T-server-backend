import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ExpiryDate } from '../value-objects/ExpiryDate.vo';
import { DomainException } from '../../../exceptions/DomainException';

describe('ExpiryDate Value Object', () => {
  it('should create valid expiry date', () => {
    const futureDate = new Date(Date.now() + 86400000);
    const expiry = ExpiryDate.create(futureDate);
    expect(expiry.value).toEqual(futureDate);
    expect(expiry.isExpired()).toBe(false);
  });

  it('should evaluate expiry correctly', () => {
    const pastDate = new Date(Date.now() - 86400000);
    const expiry = ExpiryDate.create(pastDate, true);
    expect(expiry.isExpired()).toBe(true);
  });

  it('should calculate days to expiry', () => {
    const futureDate = new Date(Date.now() + 86400000 * 5); // 5 days
    const expiry = ExpiryDate.create(futureDate);
    expect(expiry.isExpiringSoon(6)).toBe(true);
    expect(expiry.isExpiringSoon(4)).toBe(false);
  });

  describe('Property Tests', () => {
    it('should never be expired if date is in the future relative to current time', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date(Date.now() + 10000), max: new Date('2100-01-01'), noInvalidDate: true }),
          (futureDate) => {
            const expiry = ExpiryDate.create(futureDate);
            expect(expiry.isExpired()).toBe(false);
            expect(expiry.isExpiringSoon(100000)).toBe(true);
          }
        )
      );
    });

    it('should always be expired if date is in the past', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2000-01-01'), max: new Date(Date.now() - 10000), noInvalidDate: true }),
          (pastDate) => {
            const expiry = ExpiryDate.create(pastDate, true); // true for isHistoricalLoad
            expect(expiry.isExpired()).toBe(true);

          }
        )
      );
    });
  });
});
