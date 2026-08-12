import { DomainException } from '../exceptions/DomainException';

export class CompOffLedger {
  private aggregateVersion: number = 1;
  private activeCredits: { id: string; amount: number; expiryDate: Date }[] = [];

  constructor(
    public readonly ledgerId: string,
    public readonly workerId: string
  ) {}

  public credit(id: string, amount: number, expiryDate: Date): void {
    if (amount <= 0) {
      throw new DomainException('INVALID_AMOUNT', 'Credit amount must be positive.');
    }
    this.activeCredits.push({ id, amount, expiryDate });
    this.aggregateVersion++;
  }

  public deduct(amount: number): void {
    if (amount <= 0) {
      throw new DomainException('INVALID_AMOUNT', 'Deduction amount must be positive.');
    }
    
    // Deduct from oldest active credits first
    this.activeCredits.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
    
    let remainingToDeduct = amount;
    for (const credit of this.activeCredits) {
      if (remainingToDeduct === 0) break;
      if (credit.amount > 0) {
        const deduct = Math.min(credit.amount, remainingToDeduct);
        credit.amount -= deduct;
        remainingToDeduct -= deduct;
      }
    }

    if (remainingToDeduct > 0) {
      throw new DomainException('INSUFFICIENT_BALANCE', 'Insufficient Comp-Off balance.');
    }

    // Clean up empty credits
    this.activeCredits = this.activeCredits.filter(c => c.amount > 0);
    this.aggregateVersion++;
  }

  public expire(currentDate: Date): void {
    const originalLength = this.activeCredits.length;
    this.activeCredits = this.activeCredits.filter(c => c.expiryDate > currentDate);
    if (this.activeCredits.length !== originalLength) {
      this.aggregateVersion++;
    }
  }

  public getBalance(): number {
    return this.activeCredits.reduce((sum, c) => sum + c.amount, 0);
  }

  public getVersion(): number {
    return this.aggregateVersion;
  }
}
