export class ReliabilityScore {
  constructor(
    public readonly value: number,
    public readonly scoringVersion: string
  ) {
    if (value < 0 || value > 100) throw new Error('Score must be between 0 and 100');
  }
}
