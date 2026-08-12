export class AggregationBlocks {
  constructor(
    public readonly regularMinutes: number = 0,
    public readonly overtimeMinutes: number = 0,
    public readonly weekendMinutes: number = 0,
    public readonly nightShiftMinutes: number = 0,
    public readonly holidayMinutes: number = 0,
    public readonly leaveMinutes: number = 0,
    public readonly missingPunchMinutes: number = 0,
    public readonly breakMinutes: number = 0,
    public readonly shiftVarianceMinutes: number = 0
  ) {}
}
