import { describe, it, expect } from 'vitest';
import { ExpiryCalculationService } from '../services/ExpiryCalculationService';

describe('ExpiryCalculationService', () => {
  it('should calculate expiry correctly based on rules', () => {
    const service = new ExpiryCalculationService();
    const issueDate = new Date();
    
    // Assume DRIVERS_LICENSE defaults to 1 year or similar if not specified
    const expiryDate = ExpiryCalculationService.calculateExpiryBoundary(issueDate, 12);
    
    expect(expiryDate.getTime()).toBeGreaterThan(issueDate.getTime());
  });
});
