export class RestrictionSet {
  private constructor(public readonly restrictions: ReadonlyArray<string>) {}

  public static create(restrictions: string[] = []): RestrictionSet {
    return new RestrictionSet(Object.freeze([...restrictions]));
  }

  public hasRestriction(restriction: string): boolean {
    return this.restrictions.includes(restriction);
  }

  public merge(other: RestrictionSet): RestrictionSet {
    const combined = new Set([...this.restrictions, ...other.restrictions]);
    return RestrictionSet.create(Array.from(combined));
  }
}
