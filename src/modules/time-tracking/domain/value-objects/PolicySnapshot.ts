export class PolicySnapshot {
  constructor(
    public readonly attendancePolicyVersion: string,
    public readonly shiftPolicyVersion: string,
    public readonly calendarVersion: string,
    public readonly leavePolicyVersion: string,
    public readonly organizationPolicyVersion: string,
    public readonly reliabilityScoringVersion: string
  ) {}
}
