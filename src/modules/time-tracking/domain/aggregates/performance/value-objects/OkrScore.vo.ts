export class OkrScore {
  private constructor(public readonly value: number) {}

  public static create(value: number): OkrScore {
    if (value < 0 || value > 100) {
      throw new Error('OkrScore must be between 0 and 100');
    }
    return new OkrScore(value);
  }
}
