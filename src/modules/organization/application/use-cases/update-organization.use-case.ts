import { prisma } from '@shared/db/prisma';
import { RequestContext } from '@shared/context/request-context';
import { AppError } from '@shared/errors/AppError';
import { OrganizationRepository } from '../../infrastructure/repositories/organization.repository';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { OrgRole } from '../../domain/value-objects/org-role.vo';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { UpdateOrganizationDTO } from '../dtos/update-organization.dto';
import { GstinVO } from '../../domain/value-objects/gstin.vo';
import { PanVO } from '../../domain/value-objects/pan.vo';

export class UpdateOrganizationUseCase {
  async execute(context: RequestContext, organizationId: string, dto: UpdateOrganizationDTO) {
    // IDOR check
    if (context.workspace.id !== organizationId) {
      throw new AppError('Forbidden: Access denied to this organization', 403);
    }

    // Capability check
    const actorRole = new OrgRole(context.platformIdentity.role);
    const actorCapabilities = CapabilityResolver.resolve(actorRole.value);
    MembershipPolicy.assertCapability(actorCapabilities, 'MANAGE_SETTINGS');

    const repo = new OrganizationRepository(prisma);
    const organization = await repo.findById(organizationId);

    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    // Build typed args for updateDetails()
    const gstinVO = dto.gstin !== undefined ? GstinVO.create(dto.gstin) : undefined;
    const panVO = dto.panNumber !== undefined ? PanVO.create(dto.panNumber) : undefined;

    organization.updateDetails(
      new Date(),
      dto.name,
      dto.legalName,
      dto.organizationType,
      gstinVO,
      panVO,
    );

    await repo.update(organization);

    return {
      id: organization.getId(),
      name: organization.getName(),
      slug: organization.getSlug(),
      organizationType: organization.getOrganizationType(),
      status: organization.getStatus(),
      verificationStatus: organization.getVerificationStatus(),
      legalName: organization.getLegalName(),
      gstin: organization.getGstin(),
      panNumber: organization.getPanNumber(),
      updatedAt: organization.getUpdatedAt().toISOString(),
    };
  }
}


