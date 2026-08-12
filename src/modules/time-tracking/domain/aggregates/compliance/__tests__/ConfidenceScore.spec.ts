import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ConfidenceScore } from '../value-objects/ConfidenceScore.vo';
import { DomainException } from '../../../exceptions/DomainException';

describe('ConfidenceScore Value Object', () => {
  it('should create valid score', () => {
    const score = ConfidenceScore.create(85);
    expect(score.value).toBe(85);
  });

  it('should throw error for values < 0', () => {
    expect(() => ConfidenceScore.create(-1)).toThrow('Confidence score must be between 0 and 100');
  });
  
  it('should return correct high confidence status', () => {
    const high = ConfidenceScore.create(95);
    const low = ConfidenceScore.create(85);
    expect(high.isHighConfidence()).toBe(true);
    expect(low.isHighConfidence()).toBe(false);
  });
  
  it('should return correct manual review status', () => {
    const high = ConfidenceScore.create(95);
    const low = ConfidenceScore.create(85);
    expect(high.requiresManualReview()).toBe(false);
    expect(low.requiresManualReview()).toBe(true);
  });

  describe('Property Tests', () => {
    it('should always be valid between 0 and 100', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 100 }), (val) => {
          expect(() => ConfidenceScore.create(val)).not.toThrow();
        })
      );
    });

    it('should throw when outside 0 to 100', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.integer({ min: -1000, max: -1 }), fc.integer({ min: 101, max: 1000 })),
          (val) => {
            expect(() => ConfidenceScore.create(val)).toThrow();
          }
        )
      );
    });
  });
});
