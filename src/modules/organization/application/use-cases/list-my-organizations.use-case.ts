import { IOrganizationMembershipRepository } from '../../domain/repositories/membership.repository.interface';
import { IOrganizationRepository } from '../../domain/repositories/organization.repository.interface';

export class ListMyOrganizationsUseCase {
  constructor(
    private membershipRepository: IOrganizationMembershipRepository,
    private organizationRepository: IOrganizationRepository
  ) {}

  async execute(userId: string): Promise<any[]> {
    const memberships = await this.membershipRepository.findActiveByUserId(userId);
    
    const result = [];
    for (const membership of memberships) {
      const org = await this.organizationRepository.findById(membership.getOrganizationId());
      if (org) {
        result.push({
          id: membership.getId(),
          organizationId: org.getId(),
          userId: membership.getUserId(),
          role: membership.getRole(),
          status: membership.getStatus(),
          joinedAt: membership.getJoinedAt(),
          organization: {
            id: org.getId(),
            slug: org.getSlug(),
            name: org.getName(),
            legalName: org.getLegalName(),
            gstin: org.getGstin(),
            panNumber: org.getPanNumber(),
            organizationType: org.getOrganizationType(),
            status: org.getStatus(),
            verificationStatus: org.getVerificationStatus(),
          }
        });
      }
    }
    return result;
  }
}
