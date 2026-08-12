import { prisma } from '@shared/db/prisma';
import { BranchResponseDto } from '../dtos/branch.dto';
import { PrismaBranchRepository } from '../../infrastructure/repositories/branch.repository';
import { BranchNotFoundError } from '@shared/errors/organization.errors';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { RequestContext } from '@shared/context/request-context';

import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { OrgRole } from '../../domain/value-objects/org-role.vo';

export class GetBranchUseCase {
  async execute(context: RequestContext, branchId: string): Promise<BranchResponseDto> {
    const actorRole = new OrgRole(context.platformIdentity.role);
    const actorCapabilities = CapabilityResolver.resolve(actorRole.value);
    MembershipPolicy.assertCapability(actorCapabilities, 'VIEW_BRANCH');
    const organizationId = context.organization!.id;
    const repo = new PrismaBranchRepository(prisma);
    const branch = await repo.findById(organizationId, branchId);

    if (!branch) {
      throw new BranchNotFoundError();
    }

    return {
      id: branch.getId(),
      organizationId: branch.getOrganizationId(),
      name: branch.getName(),
      code: branch.getCode(),
      description: branch.getDescription(),
      address: branch.getAddress(),
      city: branch.getCity(),
      state: branch.getState(),
      country: branch.getCountry(),
      postalCode: branch.getPostalCode(),
      latitude: branch.getLatitude(),
      longitude: branch.getLongitude(),
      phone: branch.getPhone(),
      email: branch.getEmail(),
      managerId: branch.getManagerId(),
      status: branch.getStatus(),
      createdAt: branch.getCreatedAt().toISOString(),
      updatedAt: branch.getUpdatedAt().toISOString()
    };
  }
}
