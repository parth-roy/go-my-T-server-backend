import { DomainException } from '../exceptions/DomainException';

export enum ReservationStatus {
  PENDING = 'PENDING',
  GRANTED = 'GRANTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CONVERTED = 'CONVERTED' // Successfully turned into an assignment
}

export class Reservation {
  private aggregateVersion: number = 1;
  private status: ReservationStatus = ReservationStatus.PENDING;

  constructor(
    public readonly reservationId: string,
    public readonly targetId: string,
    public readonly requesterId: string,
    public readonly expiresAt: Date
  ) {}

  public grant(): void {
    if (this.status !== ReservationStatus.PENDING) {
      throw new DomainException('INVALID_STATE', 'Only pending reservations can be granted.');
    }
    this.status = ReservationStatus.GRANTED;
    this.aggregateVersion++;
  }

  public reject(): void {
    if (this.status !== ReservationStatus.PENDING) {
      throw new DomainException('INVALID_STATE', 'Only pending reservations can be rejected.');
    }
    this.status = ReservationStatus.REJECTED;
    this.aggregateVersion++;
  }

  public expire(currentDate: Date): void {
    if (this.status !== ReservationStatus.GRANTED && this.status !== ReservationStatus.PENDING) {
      throw new DomainException('INVALID_STATE', 'Cannot expire a resolved reservation.');
    }
    if (currentDate < this.expiresAt) {
      throw new DomainException('NOT_EXPIRED', 'Reservation has not yet expired.');
    }
    this.status = ReservationStatus.EXPIRED;
    this.aggregateVersion++;
  }

  public convertToAssignment(): void {
    if (this.status !== ReservationStatus.GRANTED) {
      throw new DomainException('INVALID_STATE', 'Only granted reservations can be converted.');
    }
    this.status = ReservationStatus.CONVERTED;
    this.aggregateVersion++;
  }

  public getStatus(): ReservationStatus {
    return this.status;
  }

  public getVersion(): number {
    return this.aggregateVersion;
  }
}
