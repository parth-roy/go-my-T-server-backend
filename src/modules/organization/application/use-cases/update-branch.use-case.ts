import { prisma } from '@shared/db/prisma';
import { eventBus } from '@shared/eventbus';
import { UpdateBranchDto, BranchResponseDto } from '../dtos/branch.dto';
import { PrismaBranchRepository } from '../../infrastructure/repositories/branch.repository';
import { BranchNameAlreadyExistsError, BranchNotFoundError } from '@shared/errors/organization.errors';
import { BranchEntity } from '../../domain/entities/branch.entity';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { RequestContext } from '@shared/context/request-context';

import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { OrgRole } from '../../domain/value-objects/org-role.vo';

export class UpdateBranchUseCase {
  async execute(context: RequestContext, branchId: string, dto: UpdateBranchDto): Promise<BranchResponseDto> {
    const actorRole = new OrgRole(context.platformIdentity.role);
    const actorCapabilities = CapabilityResolver.resolve(actorRole.value);
    MembershipPolicy.assertCapability(actorCapabilities, 'UPDATE_BRANCH');
    const organizationId = context.organization!.id;
    let updatedBranch: BranchEntity;

    await prisma.$transaction(async (tx) => {
      const repo = new PrismaBranchRepository(tx);

      const branch = await repo.findById(organizationId, branchId);
      if (!branch) {
        throw new BranchNotFoundError();
      }

      if (dto.name && dto.name !== branch.getName()) {
        const nameExists = await repo.existsByName(organizationId, dto.name);
        if (nameExists) throw new BranchNameAlreadyExistsError(dto.name);
      }

      branch.updateDetails(
        new Date(),
        dto.name,
        dto.description,
        dto.address,
        dto.city,
        dto.state,
        dto.country,
        dto.postalCode,
        dto.latitude,
        dto.longitude,
        dto.phone,
        dto.email,
        dto.managerId
      );

      updatedBranch = await repo.update(branch);
    });

    eventBus.emit('branch.updated', {
      branchId: updatedBranch!.getId(),
      organizationId: updatedBranch!.getOrganizationId(),
      timestamp: new Date()
    });

    return {
      id: updatedBranch!.getId(),
      organizationId: updatedBranch!.getOrganizationId(),
      name: updatedBranch!.getName(),
      code: updatedBranch!.getCode(),
      description: updatedBranch!.getDescription(),
      address: updatedBranch!.getAddress(),
      city: updatedBranch!.getCity(),
      state: updatedBranch!.getState(),
      country: updatedBranch!.getCountry(),
      postalCode: updatedBranch!.getPostalCode(),
      latitude: updatedBranch!.getLatitude(),
      longitude: updatedBranch!.getLongitude(),
      phone: updatedBranch!.getPhone(),
      email: updatedBranch!.getEmail(),
      managerId: updatedBranch!.getManagerId(),
      status: updatedBranch!.getStatus(),
      createdAt: updatedBranch!.getCreatedAt().toISOString(),
      updatedAt: updatedBranch!.getUpdatedAt().toISOString()
    };
  }
}
