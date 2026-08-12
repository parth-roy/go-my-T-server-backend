export class LeaveType {
  constructor(
    public readonly leaveTypeId: string,
    public readonly name: string,
    public readonly maxCarryForwardDays: number,
    public readonly accrualStrategy: string,
    public readonly allowsHalfDay: boolean,
    public readonly allowsHourly: boolean,
    public readonly appliesSandwichRule: boolean,
    public readonly encashmentEligible: boolean
  ) {}

  public isEncashable(): boolean {
    return this.encashmentEligible;
  }
}
