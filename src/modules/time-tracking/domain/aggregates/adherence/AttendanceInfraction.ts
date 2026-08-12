export class AttendanceInfraction {
  public id: string = 'uuid';
  public aggregateVersion: number = 1;
  constructor(
    public readonly organizationId: string,
    public readonly workerId: string,
    public readonly shiftAdherenceId: string,
    public type: string,
    public status: string,
    public pointValue: number
  ) {}
}
