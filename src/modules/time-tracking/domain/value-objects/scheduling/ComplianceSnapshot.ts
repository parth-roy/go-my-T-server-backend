export class ComplianceSnapshot {
  constructor(
    public rulesApplied: string[],
    public timestamp: Date
  ) {}
}
