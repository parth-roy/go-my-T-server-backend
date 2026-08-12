import { IInvitationRepository } from '../../domain/repositories/invitation.repository.interface';
import { IOrganizationRepository } from '../../domain/repositories/organization.repository.interface';
import { OrganizationMembershipInvitation } from '../../domain/aggregates/invitation.aggregate';
import { AppError } from '@shared/errors/AppError';

export interface ValidatedInvitationResult {
  organizationName: string;
  organizationLogo?: string; // TBD if logo exists in entity, skipping for now or return null
  role: string;
  expiresAt: Date;
  phoneMasked: string;
}

export class ValidateInvitationUseCase {
  constructor(
    private readonly invitationRepo: IInvitationRepository,
    private readonly organizationRepo: IOrganizationRepository
  ) {}

  async execute(rawToken: string): Promise<ValidatedInvitationResult> {
    const tokenHash = OrganizationMembershipInvitation.hashToken(rawToken);
    
    const invitation = await this.invitationRepo.findByTokenHash(tokenHash);
    
    if (!invitation) {
      throw AppError.notFound('Invitation not found or invalid');
    }

    if (invitation.status !== 'PENDING') {
      throw AppError.badRequest(`This invitation is already ${invitation.status.toLowerCase()}`);
    }

    if (invitation.isExpired()) {
      throw AppError.badRequest('This invitation has expired');
    }

    const organization = await this.organizationRepo.findById(invitation.organizationId);
    if (!organization) {
      throw AppError.internal('Organization not found for this invitation');
    }

    // Mask phone number (e.g. +919876543210 -> +91******3210)
    const phone = invitation.phone;
    const phoneMasked = phone.length > 4 
      ? phone.substring(0, 3) + '*'.repeat(phone.length - 7) + phone.slice(-4)
      : '***';

    return {
      organizationName: organization.getName(),
      organizationLogo: undefined, // Add logo later if model evolves
      role: invitation.role.value,
      expiresAt: invitation.expiresAt,
      phoneMasked
    };
  }
}
