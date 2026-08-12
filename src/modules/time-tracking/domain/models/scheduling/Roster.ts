export class Roster {
  public id: string;
  public aggregateVersion: number = 1;
  constructor(
    public readonly organizationId: string,
    public readonly scopeId: string,
    public readonly scopeType: string,
    public planningPeriod: any,
    public status: string
  ) {
    this.id = 'uuid';
  }
}
