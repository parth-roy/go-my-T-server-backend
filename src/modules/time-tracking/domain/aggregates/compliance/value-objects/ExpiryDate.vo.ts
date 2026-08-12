import { DomainException } from '../../../exceptions/DomainException';

export class ExpiryDate {
  private constructor(public readonly value: Date) {}

  public static create(date: Date, isHistoricalLoad: boolean = false): ExpiryDate {
    if (!isHistoricalLoad && date.getTime() <= Date.now()) {
      throw new DomainException('INVALID_EXPIRY', 'Expiry date cannot be in the past for new credentials.');
    }
    return new ExpiryDate(date);
  }

  public isExpired(currentTime: Date = new Date()): boolean {
    return this.value.getTime() <= currentTime.getTime();
  }

  public isExpiringSoon(daysThreshold: number = 30, currentTime: Date = new Date()): boolean {
    const thresholdDate = new Date(currentTime.getTime() + daysThreshold * 24 * 60 * 60 * 1000);
    return this.value.getTime() <= thresholdDate.getTime() && !this.isExpired(currentTime);
  }
}
