export class ExpiryCalculationService {
  /**
   * Calculates exact UTC expiration boundaries given an issue date and a validity period in months.
   */
  public static calculateExpiryBoundary(issueDate: Date, validityMonths: number): Date {
    const expiry = new Date(issueDate);
    expiry.setUTCMonth(expiry.getUTCMonth() + validityMonths);
    // Align to the end of the day in UTC
    expiry.setUTCHours(23, 59, 59, 999);
    return expiry;
  }
}
