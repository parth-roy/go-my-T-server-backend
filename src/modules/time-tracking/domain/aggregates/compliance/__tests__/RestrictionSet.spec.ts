import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { RestrictionSet } from '../value-objects/RestrictionSet.vo';

describe('RestrictionSet Value Object', () => {
  it('should create with array of restrictions', () => {
    const set = RestrictionSet.create(['NIGHT_SHIFT', 'HAZMAT']);
    expect(set.restrictions).toEqual(['NIGHT_SHIFT', 'HAZMAT']);
  });

  it('should check if restriction exists', () => {
    const set = RestrictionSet.create(['TEST']);
    expect(set.hasRestriction('TEST')).toBe(true);
    expect(set.hasRestriction('OTHER')).toBe(false);
  });
  
  it('should merge two restriction sets', () => {
    const set1 = RestrictionSet.create(['A', 'B']);
    const set2 = RestrictionSet.create(['B', 'C']);
    const merged = set1.merge(set2);
    expect(merged.restrictions).toEqual(['A', 'B', 'C']);
  });

  describe('Property Tests', () => {
    it('should reliably identify stored restrictions', () => {
      fc.assert(
        fc.property(fc.array(fc.string({ minLength: 1 })), (restrictions) => {
          const set = RestrictionSet.create(restrictions);
          if (restrictions.length > 0) {
            expect(set.hasRestriction(restrictions[0])).toBe(true);
          }
        })
      );
    });
  });
});
