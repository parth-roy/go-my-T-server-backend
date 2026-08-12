import { KeyResult } from './KeyResult.entity';

export class WorkerObjective {
  public id: string;
  public title: string;
  public description: string | null;
  public weight: number;
  public keyResults: KeyResult[];

  constructor(id: string, title: string, description: string | null, weight: number) {
    if (weight <= 0 || weight > 1) {
      throw new Error('Objective weight must be between 0 and 1');
    }
    this.id = id;
    this.title = title;
    this.description = description;
    this.weight = weight;
    this.keyResults = [];
  }

  public addKeyResult(keyResult: KeyResult): void {
    this.keyResults.push(keyResult);
  }

  public updateKeyResultProgress(keyResultId: string, newValue: number): void {
    const kr = this.keyResults.find((k) => k.id === keyResultId);
    if (!kr) {
      throw new Error('KeyResult not found in this objective');
    }
    kr.updateProgress(newValue);
  }

  public getObjectiveProgress(): number {
    if (this.keyResults.length === 0) return 0;
    const totalPercentage = this.keyResults.reduce((acc, kr) => acc + kr.getProgressPercentage(), 0);
    return totalPercentage / this.keyResults.length;
  }
}
