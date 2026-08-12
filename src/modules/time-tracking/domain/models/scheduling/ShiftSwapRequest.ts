export class ShiftSwapRequest {
  public id: string;
  public aggregateVersion: number = 1;
  constructor(
    public readonly requesterId: string,
    public readonly assignmentId: string,
    public status: string,
    public receiverId?: string
  ) {
    this.id = 'uuid';
  }
}
