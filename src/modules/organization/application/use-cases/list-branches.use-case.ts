import { prisma } from '@shared/db/prisma';
import { BranchResponseDto } from '../dtos/branch.dto';
import { PrismaBranchRepository } from '../../infrastructure/repositories/branch.repository';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { RequestContext } from '@shared/context/request-context';

export interface ListBranchesParams {
  limit: number;
  cursor?: { createdAt: Date; id: string };
  includeArchived?: boolean;
}

export interface ListBranchesResponse {
  data: BranchResponseDto[];
  hasNextPage: boolean;
}

import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { OrgRole } from '../../domain/value-objects/org-role.vo';

export class ListBranchesUseCase {
  async execute(context: RequestContext, params: ListBranchesParams): Promise<ListBranchesResponse> {
    const actorRole = new OrgRole(context.platformIdentity.role);
    const actorCapabilities = CapabilityResolver.resolve(actorRole.value);
    MembershipPolicy.assertCapability(actorCapabilities, 'LIST_BRANCHES');
    const organizationId = context.organization!.id;
    const repo = new PrismaBranchRepository(prisma);
    const result = await repo.list(organizationId, params);

    const dtos: BranchResponseDto[] = result.data.map(branch => ({
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
    }));

    return {
      data: dtos,
      hasNextPage: result.hasNextPage
    };
  }
}
