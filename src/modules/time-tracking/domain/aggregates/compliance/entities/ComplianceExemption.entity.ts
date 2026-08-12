export class ComplianceExemption {
  constructor(
    public readonly id: string,
    public readonly workerComplianceId: string,
    public readonly type: string,
    public readonly reason: string,
    public readonly grantedBy: string,
    public readonly expiresAt: Date,
    public readonly createdAt: Date
  ) {}

  public isExpired(currentTime: Date = new Date()): boolean {
    return this.expiresAt.getTime() <= currentTime.getTime();
  }
}
