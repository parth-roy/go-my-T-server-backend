import { describe, it, expect } from 'vitest';
import { PerformanceScoringEngine } from '../services/PerformanceScoringEngine';
import { PerformanceScoringPolicy } from '../PerformanceScoringPolicy.aggregate';
import { AdherenceSnapshot } from '../value-objects/AdherenceSnapshot.vo';

describe('PerformanceScoringEngine Domain Service', () => {
  const mockThresholds = [
    { minScore: 90, maxScore: 100, rating: 'OUTSTANDING' },
    { minScore: 75, maxScore: 89.99, rating: 'EXCEEDS_EXPECTATIONS' },
    { minScore: 50, maxScore: 74.99, rating: 'MEETS_EXPECTATIONS' },
    { minScore: 25, maxScore: 49.99, rating: 'NEEDS_IMPROVEMENT' },
    { minScore: 0, maxScore: 24.99, rating: 'UNSATISFACTORY' },
  ];

  const policy = PerformanceScoringPolicy.create(
    'p-1', 'policy-1', '1.0', new Date(), 0.7, 0.3, mockThresholds
  );

  it('should calculate deterministic score and mapping', () => {
    // OKR = 80, Adherence = 100
    // (80 * 0.7) + (100 * 0.3) = 56 + 30 = 86
    const adherence = AdherenceSnapshot.create(100, '1.0', new Date('2026-01-01'), new Date('2026-01-31'), new Date(), 'CALCULATED');
    
    const result = PerformanceScoringEngine.calculate(80, adherence, policy);
    
    expect(result.finalScore).toBe(86);
    expect(result.finalRating).toBe('EXCEEDS_EXPECTATIONS');
  });

  it('should map correctly for lower thresholds', () => {
    // OKR = 50, Adherence = 50
    // (50 * 0.7) + (50 * 0.3) = 35 + 15 = 50
    const adherence = AdherenceSnapshot.create(50, '1.0', new Date('2026-01-01'), new Date('2026-01-31'), new Date(), 'CALCULATED');
    
    const result = PerformanceScoringEngine.calculate(50, adherence, policy);
    
    expect(result.finalScore).toBe(50);
    expect(result.finalRating).toBe('MEETS_EXPECTATIONS');
  });

  it('should throw on invalid OKR score inputs', () => {
    const adherence = AdherenceSnapshot.create(100, '1.0', new Date('2026-01-01'), new Date('2026-01-31'), new Date(), 'CALCULATED');
    
    expect(() => {
      PerformanceScoringEngine.calculate(-5, adherence, policy);
    }).toThrow('okrScore must be between 0 and 100');
    
    expect(() => {
      PerformanceScoringEngine.calculate(105, adherence, policy);
    }).toThrow('okrScore must be between 0 and 100');
  });
});
