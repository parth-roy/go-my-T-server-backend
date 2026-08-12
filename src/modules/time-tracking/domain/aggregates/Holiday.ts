import { DomainException } from '../exceptions/DomainException';

export enum HolidayType {
  RECURRING = 'RECURRING',
  ONE_TIME = 'ONE_TIME',
  MOVABLE = 'MOVABLE'
}

export enum HolidayStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED'
}

export class Holiday {
  private aggregateVersion: number = 1;
  private status: HolidayStatus = HolidayStatus.ACTIVE;

  constructor(
    public readonly holidayId: string,
    public readonly calendarId: string,
    public readonly name: string,
    public readonly type: HolidayType,
    public readonly baseDate: Date,
    public readonly rule?: any
  ) {}

  public revoke(): void {
    if (this.status === HolidayStatus.REVOKED) {
      throw new DomainException('ALREADY_REVOKED', 'Holiday is already revoked.');
    }
    this.status = HolidayStatus.REVOKED;
    this.aggregateVersion++;
  }

  public getVersion(): number {
    return this.aggregateVersion;
  }

  public getStatus(): HolidayStatus {
    return this.status;
  }
}
