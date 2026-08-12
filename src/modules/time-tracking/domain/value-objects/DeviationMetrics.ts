export class DeviationMetrics {
  constructor(
    public readonly expectedStart: Date,
    public readonly actualStart: Date,
    public readonly varianceMinutes: number
  ) {}
}
