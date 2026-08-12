export enum RegulationLevel {
  FEDERAL = 'FEDERAL',
  STATE = 'STATE',
  MUNICIPAL = 'MUNICIPAL',
  COMPANY_POLICY = 'COMPANY_POLICY'
}

export class RegulatoryHierarchy {
  /**
   * Determines which regulation takes precedence based on strictness.
   * Typically, the most strict regulation wins, but if conflict occurs,
   * Federal overrides State, which overrides Municipal, which overrides Company.
   */
  public static resolveConflict(levelA: RegulationLevel, levelB: RegulationLevel): RegulationLevel {
    const precedence = {
      [RegulationLevel.FEDERAL]: 4,
      [RegulationLevel.STATE]: 3,
      [RegulationLevel.MUNICIPAL]: 2,
      [RegulationLevel.COMPANY_POLICY]: 1
    };

    return precedence[levelA] > precedence[levelB] ? levelA : levelB;
  }
}
