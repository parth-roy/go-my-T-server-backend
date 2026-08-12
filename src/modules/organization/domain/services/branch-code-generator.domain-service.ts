import * as crypto from 'crypto';

export class BranchCodeGeneratorDomainService {
  /**
   * Generates a unique branch code.
   * Format: BR-XXXXXX
   */
  static generateCode(): string {
    const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `BR-${randomPart}`;
  }
}
