export class ConfidenceScore {
  private constructor(public readonly value: number) {}

  public static create(value: number): ConfidenceScore {
    if (value < 0 || value > 100) {
      throw new Error('Confidence score must be between 0 and 100');
    }
    return new ConfidenceScore(value);
  }

  public isHighConfidence(): boolean {
    return this.value >= 90;
  }

  public requiresManualReview(): boolean {
    return this.value < 90;
  }
}
