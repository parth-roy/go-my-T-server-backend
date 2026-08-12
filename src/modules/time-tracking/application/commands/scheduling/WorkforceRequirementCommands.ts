export class CreateWorkforceRequirement {
  constructor(
    public readonly organizationId: string,
    public readonly scopeId: string,
    public readonly scopeType: string,
    public readonly timeSlot: any,
    public readonly coverage: any
  ) {}
}
