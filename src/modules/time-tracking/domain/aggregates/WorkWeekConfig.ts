import { DomainException } from '../exceptions/DomainException';

export class WorkWeekConfig {
  private aggregateVersion: number = 1;

  constructor(
    public readonly configId: string,
    public readonly calendarId: string,
    public readonly pattern: any // e.g. ["SAT", "SUN"]
  ) {}

  public updatePattern(newPattern: any): void {
    // pattern validation omitted for brevity
    // this.pattern = newPattern;
    this.aggregateVersion++;
  }

  public getVersion(): number {
    return this.aggregateVersion;
  }
}
