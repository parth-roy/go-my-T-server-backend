export class DepartmentArchivedEvent {
  constructor(
    public readonly organizationId: string,
    public readonly branchId: string,
    public readonly departmentId: string,
    public readonly actorUserId: string,
    public readonly occurredAt: Date
  ) {}
}
