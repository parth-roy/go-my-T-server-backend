import { describe, it, expect } from 'vitest';
import { RegulatoryHierarchy, RegulationLevel } from '../policies/RegulatoryHierarchy';

describe('RegulatoryHierarchy', () => {
  it('should evaluate rule precedence correctly', () => {
    expect(RegulatoryHierarchy.resolveConflict(RegulationLevel.FEDERAL, RegulationLevel.STATE)).toBe(RegulationLevel.FEDERAL);
    expect(RegulatoryHierarchy.resolveConflict(RegulationLevel.MUNICIPAL, RegulationLevel.STATE)).toBe(RegulationLevel.STATE);
  });
});
