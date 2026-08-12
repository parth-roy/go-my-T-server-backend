export class BranchCreatedEvent {
  constructor(
    public readonly branchId: string,
    public readonly organizationId: string,
    public readonly occurredAt: Date = new Date()
  ) {}
}
