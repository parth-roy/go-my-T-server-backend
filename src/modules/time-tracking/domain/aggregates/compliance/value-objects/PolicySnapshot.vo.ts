export class PolicySnapshot {
  private constructor(public readonly snapshotData: Record<string, any>) {}

  public static create(data: Record<string, any>): PolicySnapshot {
    return new PolicySnapshot(Object.freeze({ ...data }));
  }
}
