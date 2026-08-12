import { CalendarScope } from '../value-objects/CalendarScope';
import { DomainException } from '../exceptions/DomainException';

export class Calendar {
  private aggregateVersion: number = 1;

  constructor(
    public readonly calendarId: string,
    public readonly scope: CalendarScope,
    public readonly name: string,
    public readonly timezone: string,
    public readonly parentId?: string
  ) {}

  public getVersion(): number {
    return this.aggregateVersion;
  }

  public incrementVersion(): void {
    this.aggregateVersion++;
  }
}
