import { DomainException } from '../exceptions/DomainException';

export class Capacity {
  private aggregateVersion: number = 1;

  constructor(
    public readonly workerId: string,
    private maxHours: number,
    private consumedHours: number = 0,
    private fatigueScore: number = 0
  ) {}

  public consume(hours: number): void {
    if (hours <= 0) {
      throw new DomainException('INVALID_AMOUNT', 'Consumed hours must be positive.');
    }
    if (this.consumedHours + hours > this.maxHours) {
      throw new DomainException('CAPACITY_EXCEEDED', 'Consuming these hours exceeds the maximum permitted capacity.');
    }
    this.consumedHours += hours;
    this.fatigueScore += (hours * 1.5); // Simple fatigue scaling
    this.aggregateVersion++;
  }

  public restore(hours: number): void {
    this.consumedHours = Math.max(0, this.consumedHours - hours);
    this.fatigueScore = Math.max(0, this.fatigueScore - (hours * 1.5));
    this.aggregateVersion++;
  }

  public resetNightly(): void {
    this.consumedHours = 0;
    this.fatigueScore = Math.max(0, this.fatigueScore - 10); // Decay fatigue
    this.aggregateVersion++;
  }

  public getRemainingHours(): number {
    return this.maxHours - this.consumedHours;
  }

  public getFatigueScore(): number {
    return this.fatigueScore;
  }

  public getVersion(): number {
    return this.aggregateVersion;
  }
}
