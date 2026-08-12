export type EvaluationRatingValue = 'UNSATISFACTORY' | 'NEEDS_IMPROVEMENT' | 'MEETS_EXPECTATIONS' | 'EXCEEDS_EXPECTATIONS' | 'OUTSTANDING';

export class EvaluationRating {
  private constructor(public readonly value: EvaluationRatingValue) {}

  public static create(value: string): EvaluationRating {
    const validRatings: EvaluationRatingValue[] = [
      'UNSATISFACTORY', 
      'NEEDS_IMPROVEMENT', 
      'MEETS_EXPECTATIONS', 
      'EXCEEDS_EXPECTATIONS', 
      'OUTSTANDING'
    ];
    
    if (!validRatings.includes(value as EvaluationRatingValue)) {
      throw new Error(`Invalid EvaluationRating: ${value}`);
    }
    return new EvaluationRating(value as EvaluationRatingValue);
  }
}
