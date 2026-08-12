import { IOrganizationMembershipRepository } from '../repositories/membership.repository.interface';
import { MembershipStatus } from '../enums/membership.enum';
import { AppError } from '@shared/errors/AppError';

export class DepartmentManagerValidatorDomainService {
  constructor(private readonly membershipRepo: IOrganizationMembershipRepository) {}

  /**
   * Validates if a user can be a department manager.
   * Requires the user to hold an ACTIVE membership in the SAME organization.
   * Note: We don't enforce branch-specific membership yet because membership
   * is currently Organization-wide in our schema.
   */
  async validateManager(organizationId: string, managerId: string): Promise<void> {
    const membership = await this.membershipRepo.findByUserAndOrg(managerId, organizationId);
    
    if (!membership) {
      throw AppError.badRequest('Manager must belong to the organization');
    }

    if (membership.getStatus() !== MembershipStatus.ACTIVE) {
      throw AppError.badRequest('Manager membership must be ACTIVE');
    }
  }
}
