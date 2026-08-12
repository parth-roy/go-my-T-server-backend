export class KeyResultProgress {
  private constructor(
    public readonly currentValue: number,
    public readonly targetValue: number,
    public readonly unit: string
  ) {}

  public static create(currentValue: number, targetValue: number, unit: string): KeyResultProgress {
    if (targetValue <= 0) {
      throw new Error('KeyResultProgress targetValue must be greater than 0');
    }
    if (currentValue < 0) {
      throw new Error('KeyResultProgress currentValue cannot be negative');
    }
    return new KeyResultProgress(currentValue, targetValue, unit);
  }

  public getPercentage(): number {
    const percentage = (this.currentValue / this.targetValue) * 100;
    return Math.min(percentage, 100); // Cap at 100% for scoring purposes, or depends on rules
  }
}
