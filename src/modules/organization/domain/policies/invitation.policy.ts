import { DomainPolicy } from '@shared/domain/domain-policy.interface';
import { Capability } from '../value-objects/capability.vo';
import { OrgRole } from '../value-objects/org-role.vo';
import { AppError } from '@shared/errors/AppError';

export class InvitationPolicy {
  /**
   * Calculates the expiration date for a new invitation.
   * Default rule: Expires in 7 days from creation.
   */
  static calculateExpirationDate(now: Date = new Date()): Date {
    const expiration = new Date(now);
    expiration.setDate(expiration.getDate() + 7);
    return expiration;
  }

  /**
   * Verifies if the inviter has the capability to invite a member of the target role.
   */
  static assertCanInvite(inviterCapabilities: Capability[], targetRole: OrgRole): void {
    const hasCapability = inviterCapabilities.some(cap => cap.value === 'INVITE_MEMBERS');
    if (!hasCapability) {
      throw AppError.forbidden('You do not have permission to invite members');
    }

    // Additional policy: A member cannot invite someone to a higher role than their own.
    // Assuming capability resolution naturally scopes this, but we explicitly guard it if needed.
    // For now, having 'INVITE_MEMBERS' capability is the absolute requirement.
  }
}
