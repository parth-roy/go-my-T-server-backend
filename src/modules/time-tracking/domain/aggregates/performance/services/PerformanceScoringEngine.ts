import { AdherenceSnapshot } from '../value-objects/AdherenceSnapshot.vo';
import { EvaluationRating, EvaluationRatingValue } from '../value-objects/EvaluationRating.vo';
import { PerformanceScoringPolicy } from '../PerformanceScoringPolicy.aggregate';

export interface ScoringResult {
  finalScore: number;
  finalRating: EvaluationRatingValue;
}

export class PerformanceScoringEngine {
  /**
   * Calculates the final performance score and determines the rating
   * based purely on deterministic inputs, side-effect free.
   */
  public static calculate(
    okrScore: number,
    adherenceSnapshot: AdherenceSnapshot,
    policy: PerformanceScoringPolicy
  ): ScoringResult {
    if (okrScore < 0 || okrScore > 100) {
      throw new Error('okrScore must be between 0 and 100');
    }

    // 1. Calculate weighted final score
    const weightedOkr = okrScore * policy.okrWeight;
    const weightedAdherence = adherenceSnapshot.score * policy.adherenceWeight;
    
    // Round to 2 decimal places to avoid floating point precision issues
    const rawScore = weightedOkr + weightedAdherence;
    const finalScore = Math.round(rawScore * 100) / 100;

    // 2. Map score to rating using policy thresholds
    const rating = this.determineRating(finalScore, policy.ratingThresholds);

    return {
      finalScore,
      finalRating: rating
    };
  }

  private static determineRating(score: number, thresholds: any): EvaluationRatingValue {
    if (!Array.isArray(thresholds)) {
      throw new Error('Invalid policy: ratingThresholds must be an array');
    }

    // Sort thresholds descending to find the highest matching bucket
    const sortedThresholds = [...thresholds].sort((a, b) => b.minScore - a.minScore);

    for (const threshold of sortedThresholds) {
      if (score >= threshold.minScore) {
        // Validate it's a known rating value
        return EvaluationRating.create(threshold.rating).value;
      }
    }

    // Fallback if no threshold matches (should theoretically be caught by policy validation, but safe default)
    return 'UNSATISFACTORY';
  }
}
