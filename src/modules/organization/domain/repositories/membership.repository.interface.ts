import { OrganizationMembershipEntity } from '../entities/membership.entity';

/**
 * Responsibility:
 * Manages the persistence, retrieval, and lifecycle of Organization Memberships.
 * Handles the assignment of roles and membership statuses.
 * 
 * Aggregate ownership:
 * Owns the `OrganizationMembershipEntity` entity. It acts as the boundary for all 
 * user-to-organization relationships.
 * 
 * Transaction expectations:
 * Transaction orchestration MUST be handled by the Application Layer (e.g., via Unit of Work).
 * The Repository contract assumes the Application Layer provides the transactional context implicitly
 * to the infrastructure implementation, avoiding leaked 'tx' parameters in the domain interface.
 * 
 * Methods that should never exist:
 * - `hardDelete()`: Memberships should be marked as TERMINATED rather than deleted, 
 *   to preserve audit history of past employees/contractors.
 * - `updatePrimaryOwnerWithoutTransaction()`: Any role swap involving the primary owner 
 *   must never be exposed as an unsafe single-row mutation.
 */
export interface IOrganizationMembershipRepository {
  /**
   * Retrieves a specific membership by its internal ID.
   */
  findById(id: string): Promise<OrganizationMembershipEntity | null>;

  /**
   * Retrieves the exact membership record for a specific user in a specific organization.
   */
  findByUserAndOrg(userId: string, organizationId: string): Promise<OrganizationMembershipEntity | null>;

  /**
   * Retrieves the exact membership record for a specific user phone in a specific organization.
   */
  findByPhoneAndOrg(phone: string, organizationId: string): Promise<OrganizationMembershipEntity | null>;

  /**
   * Retrieves all active organizations a user belongs to.
   * Useful for token generation and login context selection.
   */
  findActiveByUserId(userId: string): Promise<OrganizationMembershipEntity[]>;

  /**
   * Retrieves all active members belonging to a specific organization.
   */
  findActiveByOrgId(organizationId: string): Promise<OrganizationMembershipEntity[]>;

  /**
   * Retrieves paginated members for an organization.
   */
  findMany(
    organizationId: string, 
    options: {
      page: number;
      limit: number;
      status?: string;
      role?: string;
      search?: string;
      sort?: string;
    }
  ): Promise<{ data: OrganizationMembershipEntity[]; total: number }>;

  /**
   * Creates a new membership record.
   */
  create(entity: OrganizationMembershipEntity): Promise<OrganizationMembershipEntity>;

  /**
   * Updates a member's role or status.
   */
  update(entity: OrganizationMembershipEntity): Promise<OrganizationMembershipEntity>;

  /**
   * Transfers primary ownership atomically.
   */
  transferPrimaryOwnership(organizationId: string, oldOwnerId: string, newOwnerId: string): Promise<void>;

  /**
   * Terminates a membership (sets status to TERMINATED) instead of hard deleting.
   */
  terminate(id: string): Promise<void>;
}
