import { DomainException } from '../exceptions/DomainException';

export class LeaveBalanceLedger {
  private aggregateVersion: number = 1;
  
  constructor(
    public readonly ledgerId: string,
    public readonly workerId: string,
    public readonly leaveTypeId: string,
    private balance: number = 0
  ) {}

  public accrue(amount: number): void {
    if (amount <= 0) {
      throw new DomainException('INVALID_AMOUNT', 'Accrual amount must be positive.');
    }
    this.balance += amount;
    this.aggregateVersion++;
  }

  public deduct(amount: number): void {
    if (amount <= 0) {
      throw new DomainException('INVALID_AMOUNT', 'Deduction amount must be positive.');
    }
    if (this.balance - amount < 0) {
      throw new DomainException('INSUFFICIENT_BALANCE', 'Insufficient leave balance.');
    }
    this.balance -= amount;
    this.aggregateVersion++;
  }

  public refund(amount: number): void {
    if (amount <= 0) {
      throw new DomainException('INVALID_AMOUNT', 'Refund amount must be positive.');
    }
    this.balance += amount;
    this.aggregateVersion++;
  }

  public expire(amount: number): void {
    if (amount <= 0) {
      throw new DomainException('INVALID_AMOUNT', 'Expiry amount must be positive.');
    }
    this.balance = Math.max(0, this.balance - amount);
    this.aggregateVersion++;
  }

  public getBalance(): number {
    return this.balance;
  }

  public getVersion(): number {
    return this.aggregateVersion;
  }
}
