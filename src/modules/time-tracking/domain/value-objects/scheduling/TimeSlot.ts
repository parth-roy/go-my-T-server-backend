export class TimeSlot {
  constructor(
    public startTime: Date,
    public endTime: Date,
    public timeZone: string
  ) {}
}
