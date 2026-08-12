import { OrganizationEntity } from '../entities/organization.entity';

/**
 * Responsibility:
 * Manages the persistence and retrieval of the Organization aggregate root.
 * Responsible for verifying uniqueness (slug, gstin, panNumber) and fetching
 * the aggregate along with its primary dependencies if needed.
 * 
 * Aggregate ownership:
 * Owns the `OrganizationEntity` aggregate. Does NOT own `OrganizationMembershipEntity` directly 
 * for creation/deletion, as membership is a separate aggregate/entity with its own lifecycle,
 * but may fetch members when rehydrating the Organization aggregate.
 * 
 * Transaction expectations:
 * Transaction orchestration MUST be handled by the Application Layer (e.g., via Unit of Work).
 * The Repository contract assumes the Application Layer provides the transactional context implicitly
 * to the infrastructure implementation, avoiding leaked 'tx' parameters in the domain interface.
 * 
 * Methods that should never exist:
 * - `delete()` or `hardDelete()`: Organizations are strictly soft-deleted or archived.
 * - `addMember()`: This belongs to the Membership domain/repository.
 * - `updateVerification()`: Verification mutations should be explicit use-cases, 
 *   but technically persist via a generic `update` or specific `updateStatus`.
 */
export interface IOrganizationRepository {
  /**
   * Retrieves an Organization by its internal ID.
   */
  findById(id: string): Promise<OrganizationEntity | null>;

  /**
   * Retrieves an Organization by its public slug.
   */
  findBySlug(slug: string): Promise<OrganizationEntity | null>;

  /**
   * Fast check if a slug is already taken.
   */
  existsBySlug(slug: string): Promise<boolean>;

  /**
   * Fast check if a GSTIN is already registered.
   */
  existsByGSTIN(gstin: string): Promise<boolean>;

  /**
   * Fast check if a PAN is already registered.
   */
  existsByPAN(panNumber: string): Promise<boolean>;

  /**
   * Creates a new Organization.
   */
  create(entity: OrganizationEntity): Promise<OrganizationEntity>;

  /**
   * Updates core organization details.
   */
  update(entity: OrganizationEntity): Promise<OrganizationEntity>;

  /**
   * Soft deletes the organization by setting the deletedAt timestamp
   * and updating the status to ARCHIVED.
   */
  softDelete(id: string): Promise<void>;
}
