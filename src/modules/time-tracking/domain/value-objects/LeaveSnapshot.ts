export class LeaveSnapshot {
  constructor(
    public readonly leavePolicyVersion: string,
    public readonly approvalPolicyVersion: string,
    public readonly holidayCalendarVersion: string,
    public readonly shiftPolicyVersion: string,
    public readonly organizationPolicyVersion: string
  ) {}
}
