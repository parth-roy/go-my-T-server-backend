import { OrganizationMembershipInvitation } from '../aggregates/invitation.aggregate';

export interface IInvitationRepository {
  /**
   * Saves an invitation (creates or updates).
   */
  save(invitation: OrganizationMembershipInvitation, tx?: any): Promise<void>;

  /**
   * Finds an active (pending) invitation for a specific organization and phone.
   */
  findPendingByPhone(organizationId: string, phone: string, tx?: any): Promise<OrganizationMembershipInvitation | null>;

  /**
   * Finds an invitation by its hashed token.
   */
  findByTokenHash(tokenHash: string, tx?: any): Promise<OrganizationMembershipInvitation | null>;
}
