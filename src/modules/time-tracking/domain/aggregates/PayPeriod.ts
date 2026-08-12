import { DomainException } from '../exceptions/DomainException';

export enum PayPeriodState {
  OPEN = 'OPEN',
  PROCESSING = 'PROCESSING',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED'
}

export class PayPeriod {
  private state: PayPeriodState = PayPeriodState.OPEN;
  private aggregateVersion: string = '1.0';

  constructor(
    public readonly payPeriodId: string,
    public readonly organizationId: string,
    public readonly startDate: Date,
    public readonly endDate: Date
  ) {}

  public closePeriod(): void {
    if (this.state !== PayPeriodState.OPEN) {
      throw new DomainException('INVALID_STATE', 'Pay Period is not open.');
    }
    this.state = PayPeriodState.PROCESSING;
  }

  public finalizeClosure(): void {
    if (this.state !== PayPeriodState.PROCESSING) {
      throw new DomainException('INVALID_STATE', 'Pay Period must be processing to finalize.');
    }
    this.state = PayPeriodState.CLOSED;
  }

  public archive(): void {
    if (this.state !== PayPeriodState.CLOSED) {
      throw new DomainException('INVALID_STATE', 'Pay Period must be closed before archiving.');
    }
    this.state = PayPeriodState.ARCHIVED;
  }

  public getState(): PayPeriodState {
    return this.state;
  }

  public getVersion(): string {
    return this.aggregateVersion;
  }
}
