export class AdherenceSnapshot {
  private constructor(
    public readonly score: number,
    public readonly policyVersion: string,
    public readonly windowStart: Date,
    public readonly windowEnd: Date,
    public readonly calculatedAt: Date,
    public readonly status: string
  ) {}

  public static create(
    score: number,
    policyVersion: string,
    windowStart: Date,
    windowEnd: Date,
    calculatedAt: Date,
    status: string
  ): AdherenceSnapshot {
    if (score < 0 || score > 100) {
      throw new Error('Adherence score must be between 0 and 100');
    }
    if (windowStart >= windowEnd) {
      throw new Error('windowStart must be before windowEnd');
    }
    if (status !== 'CALCULATED') {
      throw new Error('AdherenceSnapshot requires a CALCULATED status');
    }

    return new AdherenceSnapshot(
      score,
      policyVersion,
      new Date(windowStart.getTime()),
      new Date(windowEnd.getTime()),
      new Date(calculatedAt.getTime()),
      status
    );
  }
}
