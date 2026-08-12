import { KeyResultProgress } from '../value-objects/KeyResultProgress.vo';

export class KeyResult {
  public id: string;
  public title: string;
  public targetValue: number;
  public currentValue: number;
  public unit: string;

  constructor(id: string, title: string, targetValue: number, unit: string) {
    if (targetValue <= 0) {
      throw new Error('KeyResult targetValue must be greater than 0');
    }
    this.id = id;
    this.title = title;
    this.targetValue = targetValue;
    this.currentValue = 0;
    this.unit = unit;
  }

  public updateProgress(newValue: number): void {
    const progress = KeyResultProgress.create(newValue, this.targetValue, this.unit);
    this.currentValue = progress.currentValue;
  }

  public getProgressPercentage(): number {
    const progress = KeyResultProgress.create(this.currentValue, this.targetValue, this.unit);
    return progress.getPercentage();
  }
}
