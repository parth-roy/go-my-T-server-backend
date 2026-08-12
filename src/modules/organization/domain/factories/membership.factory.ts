import { OrganizationMembershipEntity } from '../entities/membership.entity';
import { MembershipStatus, OrganizationRole } from '../enums/membership.enum';

export class MembershipFactory {
  /**
   * Creates a new Membership Entity for an existing Organization.
   * IDs and timestamps must be provided by the Application layer.
   */
  public static create(
    id: string,
    organizationId: string,
    userId: string,
    role: OrganizationRole,
    createdAt: Date
  ): OrganizationMembershipEntity {
    // Basic invariant checks
    if (!organizationId || !userId) {
      throw new Error('organizationId and userId are required to create a membership.');
    }

    return OrganizationMembershipEntity.reconstitute(
      id,
      organizationId,
      userId,
      role,
      MembershipStatus.ACTIVE,
      createdAt, // joinedAt
      createdAt, // createdAt
      createdAt  // updatedAt
    );
  }

  /**
   * Factory method exclusively for creating the initial Primary Owner
   * at the moment of Organization birth.
   */
  public static createPrimaryOwner(
    id: string,
    organizationId: string,
    userId: string,
    createdAt: Date
  ): OrganizationMembershipEntity {
    return this.create(
      id,
      organizationId,
      userId,
      OrganizationRole.PRIMARY_OWNER,
      createdAt
    );
  }
}
