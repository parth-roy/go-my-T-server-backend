import { DomainException } from '../exceptions/DomainException';
import { AvailabilityWindow } from '../value-objects/AvailabilityValueObjects';

export enum AvailabilityStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  BUSY = 'BUSY',
  OFF_DUTY = 'OFF_DUTY',
  ON_LEAVE = 'ON_LEAVE',
  ON_BREAK = 'ON_BREAK'
}

export class Availability {
  private aggregateVersion: number = 1;

  constructor(
    public readonly workerId: string,
    private status: AvailabilityStatus = AvailabilityStatus.OFF_DUTY,
    private windows: AvailabilityWindow[] = []
  ) {}

  public makeAvailable(windows: AvailabilityWindow[]): void {
    if (this.status === AvailabilityStatus.ON_LEAVE || this.status === AvailabilityStatus.BUSY) {
      throw new DomainException('INVALID_TRANSITION', 'Cannot become available while busy or on leave.');
    }
    this.status = AvailabilityStatus.AVAILABLE;
    this.windows = windows;
    this.aggregateVersion++;
  }

  public reserve(): void {
    if (this.status !== AvailabilityStatus.AVAILABLE) {
      throw new DomainException('NOT_AVAILABLE', 'Worker is not currently available to be reserved.');
    }
    this.status = AvailabilityStatus.RESERVED;
    this.aggregateVersion++;
  }

  public releaseReservation(): void {
    if (this.status !== AvailabilityStatus.RESERVED) {
      throw new DomainException('INVALID_TRANSITION', 'Worker is not reserved.');
    }
    this.status = AvailabilityStatus.AVAILABLE;
    this.aggregateVersion++;
  }

  public assignWork(): void {
    if (this.status !== AvailabilityStatus.RESERVED && this.status !== AvailabilityStatus.AVAILABLE) {
      throw new DomainException('INVALID_TRANSITION', 'Worker must be available or reserved to accept work.');
    }
    this.status = AvailabilityStatus.BUSY;
    this.aggregateVersion++;
  }

  public completeWork(): void {
    if (this.status !== AvailabilityStatus.BUSY) {
      throw new DomainException('INVALID_TRANSITION', 'Worker is not busy.');
    }
    this.status = AvailabilityStatus.AVAILABLE; // Back to available, though shift might have ended, to be handled by policy
    this.aggregateVersion++;
  }
  
  public goOffDuty(): void {
    this.status = AvailabilityStatus.OFF_DUTY;
    this.windows = [];
    this.aggregateVersion++;
  }

  public getStatus(): AvailabilityStatus {
    return this.status;
  }

  public getWindows(): AvailabilityWindow[] {
    return [...this.windows];
  }

  public getVersion(): number {
    return this.aggregateVersion;
  }
}
