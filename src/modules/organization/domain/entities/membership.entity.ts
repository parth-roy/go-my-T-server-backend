import { MembershipStatus, OrganizationRole } from '../enums/membership.enum';

export class OrganizationMembershipEntity {
  private constructor(
    private readonly id: string,
    private readonly organizationId: string,
    private readonly userId: string,
    private role: OrganizationRole,
    private status: MembershipStatus,
    private readonly joinedAt: Date,
    private readonly createdAt: Date,
    private updatedAt: Date
  ) {}

  public static reconstitute(
    id: string,
    organizationId: string,
    userId: string,
    role: OrganizationRole,
    status: MembershipStatus,
    joinedAt: Date,
    createdAt: Date,
    updatedAt: Date
  ): OrganizationMembershipEntity {
    return new OrganizationMembershipEntity(
      id,
      organizationId,
      userId,
      role,
      status,
      joinedAt,
      createdAt,
      updatedAt
    );
  }

  // Domain behavior methods
  public updateRole(newRole: OrganizationRole, updatedAt: Date): void {
    if (this.status !== MembershipStatus.ACTIVE) {
      throw new Error('Cannot change role of a non-active member.');
    }
    this.role = newRole;
    this.updatedAt = updatedAt;
  }

  public terminate(updatedAt: Date): void {
    if (this.status === MembershipStatus.TERMINATED) return;
    
    // A Primary Owner cannot simply be terminated. Ownership must be transferred first.
    // This invariant is typically checked at the aggregate/policy level, but we can enforce it here too.
    if (this.role === OrganizationRole.PRIMARY_OWNER) {
      throw new Error('Cannot terminate the primary owner. Transfer ownership first.');
    }

    this.status = MembershipStatus.TERMINATED;
    this.updatedAt = updatedAt;
  }

  public suspend(updatedAt: Date): void {
    if (this.status === MembershipStatus.TERMINATED) {
      throw new Error('Cannot suspend a terminated member.');
    }
    if (this.role === OrganizationRole.PRIMARY_OWNER) {
      throw new Error('Cannot suspend the primary owner.');
    }

    this.status = MembershipStatus.SUSPENDED;
    this.updatedAt = updatedAt;
  }

  public reactivate(updatedAt: Date): void {
    if (this.status !== MembershipStatus.SUSPENDED) {
      throw new Error('Can only reactivate a suspended member.');
    }

    this.status = MembershipStatus.ACTIVE;
    this.updatedAt = updatedAt;
  }

  // Getters
  public getId(): string { return this.id; }
  public getOrganizationId(): string { return this.organizationId; }
  public getUserId(): string { return this.userId; }
  public getRole(): OrganizationRole { return this.role; }
  public getStatus(): MembershipStatus { return this.status; }
  public getJoinedAt(): Date { return this.joinedAt; }
  public getCreatedAt(): Date { return this.createdAt; }
  public getUpdatedAt(): Date { return this.updatedAt; }
}
