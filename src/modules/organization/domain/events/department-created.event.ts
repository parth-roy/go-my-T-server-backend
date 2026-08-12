export class DepartmentCreatedEvent {
  constructor(
    public readonly organizationId: string,
    public readonly branchId: string,
    public readonly departmentId: string,
    public readonly actorUserId: string,
    public readonly occurredAt: Date,
    public readonly payload: {
      name: string;
      code: string;
      managerId?: string | null;
    }
  ) {}
}
