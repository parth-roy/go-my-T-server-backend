import { randomUUID } from 'crypto';
import { prisma } from '@shared/db/prisma';
import { eventBus } from '@shared/eventbus';
import { CreateBranchDto, BranchResponseDto } from '../dtos/branch.dto';
import { BranchEntity } from '../../domain/entities/branch.entity';
import { PrismaBranchRepository } from '../../infrastructure/repositories/branch.repository';
import { BranchCodeGeneratorDomainService } from '../../domain/services/branch-code-generator.domain-service';
import { BranchCodeAlreadyExistsError, BranchNameAlreadyExistsError } from '@shared/errors/organization.errors';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { RequestContext } from '@shared/context/request-context';

import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { OrgRole } from '../../domain/value-objects/org-role.vo';

export class CreateBranchUseCase {
  async execute(context: RequestContext, dto: CreateBranchDto): Promise<BranchResponseDto> {
    const actorRole = new OrgRole(context.platformIdentity.role);
    const actorCapabilities = CapabilityResolver.resolve(actorRole.value);
    MembershipPolicy.assertCapability(actorCapabilities, 'CREATE_BRANCH');
    const organizationId = context.organization!.id;
    const branchId = randomUUID();
    const code = BranchCodeGeneratorDomainService.generateCode();

    const branch = BranchEntity.reconstitute(
      branchId,
      organizationId,
      dto.name,
      code,
      dto.description || null,
      dto.address,
      dto.city,
      dto.state,
      dto.country || 'India',
      dto.postalCode,
      dto.latitude ?? null,
      dto.longitude ?? null,
      dto.phone || null,
      dto.email || null,
      dto.managerId || null,
      'ACTIVE' as any, // BranchStatus.ACTIVE
      new Date(),
      new Date(),
      null
    );

    let createdBranch: BranchEntity;

    await prisma.$transaction(async (tx) => {
      const repo = new PrismaBranchRepository(tx);

      // Pre-checks
      const codeExists = await repo.existsByCode(organizationId, code);
      if (codeExists) throw new BranchCodeAlreadyExistsError(code);

      const nameExists = await repo.existsByName(organizationId, dto.name);
      if (nameExists) throw new BranchNameAlreadyExistsError(dto.name);

      createdBranch = await repo.create(branch);
    });

    eventBus.emit('branch.created', {
      branchId: createdBranch!.getId(),
      organizationId: createdBranch!.getOrganizationId(),
      timestamp: new Date()
    });

    return {
      id: createdBranch!.getId(),
      organizationId: createdBranch!.getOrganizationId(),
      name: createdBranch!.getName(),
      code: createdBranch!.getCode(),
      description: createdBranch!.getDescription(),
      address: createdBranch!.getAddress(),
      city: createdBranch!.getCity(),
      state: createdBranch!.getState(),
      country: createdBranch!.getCountry(),
      postalCode: createdBranch!.getPostalCode(),
      latitude: createdBranch!.getLatitude(),
      longitude: createdBranch!.getLongitude(),
      phone: createdBranch!.getPhone(),
      email: createdBranch!.getEmail(),
      managerId: createdBranch!.getManagerId(),
      status: createdBranch!.getStatus(),
      createdAt: createdBranch!.getCreatedAt().toISOString(),
      updatedAt: createdBranch!.getUpdatedAt().toISOString()
    };
  }
}
