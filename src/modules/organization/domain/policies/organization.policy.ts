import { OrganizationEntity } from '../entities/organization.entity';
import { OrganizationStatus, OrgVerifStatus } from '../enums/organization.enum';

export class OrganizationPolicy {
  /**
   * Evaluates if an Organization is eligible to be marked as ACTIVE.
   * Business invariant: An organization cannot be ACTIVE unless it is VERIFIED.
   */
  public static canBeActivated(org: OrganizationEntity): boolean {
    if (org.getStatus() === OrganizationStatus.ARCHIVED) {
      return false; // Archived orgs cannot be activated directly without a restore flow.
    }
    
    if (org.getVerificationStatus() !== OrgVerifStatus.VERIFIED) {
      return false; // Must be verified by admin first.
    }

    return true;
  }

  /**
   * Evaluates if an Organization has completed basic profile requirements.
   * Useful for UI progress bars or gates.
   */
  public static isProfileComplete(org: OrganizationEntity): boolean {
    return !!(org.getLegalName() && org.getPanNumber() && org.getGstin());
  }
}
