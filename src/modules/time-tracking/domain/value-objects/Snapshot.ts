export class Snapshot {
  constructor(
    public readonly calculationEngineVersion: string,
    public readonly policyVersion: string,
    public readonly ruleVersion: string,
    public readonly holidayCalendarVersion: string,
    public readonly timeZoneVersion: string
  ) {}
}
