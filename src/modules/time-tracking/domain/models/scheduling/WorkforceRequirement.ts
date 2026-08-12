export class WorkforceRequirement {
  public id: string;
  public aggregateVersion: number = 1;
  constructor(
    public readonly organizationId: string,
    public readonly scopeId: string,
    public readonly scopeType: 'BRANCH' | 'TEAM' | 'PROJECT',
    public timeSlot: any,
    public coverage: any
  ) {
    this.id = 'uuid';
  }
}
