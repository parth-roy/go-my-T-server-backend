export class DepartmentCodeGeneratorDomainService {
  /**
   * Generates a unique secure code for a department if no preferred code is valid.
   * Format: DEPT-[random 6 chars]
   * The caller repository will ensure DB uniqueness.
   */
  static generateCode(preferredCode?: string): string {
    if (preferredCode && /^[A-Z0-9_-]{2,10}$/i.test(preferredCode)) {
      return preferredCode.toUpperCase();
    }
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `DEPT-${randomSuffix}`;
  }
}
