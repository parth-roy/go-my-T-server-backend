export class CalculationAuditTrail {
  constructor(
    public readonly dailyBreakdown: Record<string, any>,
    public readonly shiftBreakdown: Record<string, any>,
    public readonly appliedRules: Record<string, any>,
    public readonly sourceEventIds: string[],
    public readonly calculationMetadata: Record<string, any>
  ) {}
}
