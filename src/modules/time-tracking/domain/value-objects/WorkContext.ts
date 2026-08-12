export enum WorkContextType {
  SHIFT = 'SHIFT',
  TRIP = 'TRIP',
  BOOKING = 'BOOKING',
  WAREHOUSE = 'WAREHOUSE',
  TRAINING = 'TRAINING',
  GIG_TASK = 'GIG_TASK',
  CUSTOM = 'CUSTOM',
}

export class WorkContext {
  private constructor(
    public readonly contextType: WorkContextType,
    public readonly contextId: string
  ) {}

  public static create(type: WorkContextType, id: string): WorkContext {
    return new WorkContext(type, id);
  }

  public toJSON() {
    return {
      contextType: this.contextType,
      contextId: this.contextId,
    };
  }

  public static fromJSON(json: any): WorkContext {
    return new WorkContext(json.contextType, json.contextId);
  }

  public equals(other: WorkContext): boolean {
    return this.contextType === other.contextType && this.contextId === other.contextId;
  }
}
