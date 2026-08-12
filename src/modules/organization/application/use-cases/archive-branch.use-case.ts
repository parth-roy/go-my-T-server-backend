import { prisma } from '@shared/db/prisma';
import { eventBus } from '@shared/eventbus';
import { PrismaBranchRepository } from '../../infrastructure/repositories/branch.repository';
import { BranchNotFoundError } from '@shared/errors/organization.errors';
import { BranchEntity } from '../../domain/entities/branch.entity';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { RequestContext } from '@shared/context/request-context';

import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { OrgRole } from '../../domain/value-objects/org-role.vo';

export class ArchiveBranchUseCase {
  async execute(context: RequestContext, branchId: string): Promise<void> {
    const actorRole = new OrgRole(context.platformIdentity.role);
    const actorCapabilities = CapabilityResolver.resolve(actorRole.value);
    MembershipPolicy.assertCapability(actorCapabilities, 'ARCHIVE_BRANCH');
    const organizationId = context.organization!.id;
    let archivedBranch: BranchEntity;

    await prisma.$transaction(async (tx) => {
      const repo = new PrismaBranchRepository(tx);

      const branch = await repo.findById(organizationId, branchId);
      if (!branch) {
        throw new BranchNotFoundError();
      }

      // FUTURE: Check if dependent entities exist and throw error if so
      
      branch.archive(new Date());
      archivedBranch = await repo.update(branch);
    });

    eventBus.emit('branch.archived', {
      branchId: archivedBranch!.getId(),
      organizationId: archivedBranch!.getOrganizationId(),
      timestamp: new Date()
    });
  }
}
