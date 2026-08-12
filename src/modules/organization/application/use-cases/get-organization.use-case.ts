import { prisma } from '@shared/db/prisma';
import { RequestContext } from '@shared/context/request-context';
import { AppError } from '@shared/errors/AppError';
import { OrganizationRepository } from '../../infrastructure/repositories/organization.repository';

export class GetOrganizationUseCase {
  async execute(context: RequestContext, organizationId: string) {
    if (context.workspace.id !== organizationId) {
      throw new AppError('Forbidden: Access denied to this organization', 403);
    }

    const repo = new OrganizationRepository(prisma);
    const organization = await repo.findById(organizationId);

    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

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
      createdAt: organization.getCreatedAt().toISOString(),
    };
  }
}
