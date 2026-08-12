import { prisma } from '@shared/db/prisma';
import { RequestContext } from '@shared/context/request-context';
import { AppError } from '@shared/errors/AppError';
import { OrganizationRepository } from '../../infrastructure/repositories/organization.repository';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { OrgRole } from '../../domain/value-objects/org-role.vo';
import { MembershipPolicy } from '../../domain/policies/membership.policy';

export class DeleteOrganizationUseCase {
  async execute(context: RequestContext, organizationId: string): Promise<void> {
    // IDOR check: caller must be operating within the target organization's workspace
    if (context.workspace.id !== organizationId) {
      throw new AppError('Forbidden: Access denied to this organization', 403);
    }

    // Capability check: only actors with MANAGE_SETTINGS can delete the organization
    const actorRole = new OrgRole(context.platformIdentity.role);
    const actorCapabilities = CapabilityResolver.resolve(actorRole.value);
    MembershipPolicy.assertCapability(actorCapabilities, 'MANAGE_SETTINGS');

    const repo = new OrganizationRepository(prisma);
    const organization = await repo.findById(organizationId);

    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    if (organization.getStatus() === 'ARCHIVED') {
      throw new AppError('Organization is already archived', 400);
    }

    await repo.softDelete(organizationId);
  }
}
