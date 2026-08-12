export class RosterAssignment {
  public id: string;
  public aggregateVersion: number = 1;
  constructor(
    public readonly rosterId: string,
    public readonly requirementId: string,
    public readonly workerId: string,
    public timeSlot: any,
    public status: string,
    public complianceSnapshot?: any
  ) {
    this.id = 'uuid';
  }
}
