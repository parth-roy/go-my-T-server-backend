import { randomUUID } from 'crypto';
import { prisma } from '@shared/db/prisma';
import { eventBus } from '@shared/eventbus';
import { AppError } from '@shared/errors/AppError';
import { CreateOrganizationDTO, OrganizationResponseDTO } from '../dtos/create-organization.dto';
import { OrganizationFactory } from '../../domain/factories/organization.factory';
import { MembershipFactory } from '../../domain/factories/membership.factory';
import { OrganizationRepository } from '../../infrastructure/repositories/organization.repository';
import { OrganizationMembershipRepository } from '../../infrastructure/repositories/membership.repository';
import { OrganizationType } from '../../domain/enums/organization.enum';

export class CreateOrganizationUseCase {
  async execute(userId: string, dto: CreateOrganizationDTO): Promise<OrganizationResponseDTO> {
    // Note: We intentionally rely on Database constraints for uniqueness checks (slug, gstin, panNumber)
    // to avoid race conditions. The Infrastructure layer catches P2002 and translates them into Application errors.
    
    const orgId = randomUUID();
    const membershipId = randomUUID();
    const now = new Date();

    // 2. Domain Factories (In-memory creation and invariant validation)
    const organization = OrganizationFactory.create(
      orgId,
      dto.slug,
      dto.name,
      dto.legalName || null,
      dto.gstin || null,
      dto.panNumber || null,
      dto.organizationType || OrganizationType.COMPANY,
      userId,
      now
    );

    const membership = MembershipFactory.createPrimaryOwner(
      membershipId,
      orgId,
      userId,
      now
    );

    // 3. Persist via Transaction (Unit of Work)
    await prisma.$transaction(async (tx) => {
      const txOrgRepo = new OrganizationRepository(tx);
      const txMemRepo = new OrganizationMembershipRepository(tx);

      await txOrgRepo.create(organization);
      await txMemRepo.create(membership);
    });

    // 4. Publish Domain Event
    // TODO/ADR: Outbox Pattern Implementation
    // Currently, this event is published synchronously in-memory after the transaction commits.
    // If the process crashes exactly between the DB commit and the eventBus emission,
    // the event is lost. To guarantee at-least-once delivery, we should implement the 
    // Transactional Outbox pattern by persisting the event in the same Prisma transaction above.
    eventBus.emit('organization.created', {
      organizationId: orgId,
      createdById: userId,
      timestamp: now
    });

    // 5. Return mapped Response DTO
    return {
      id: organization.getId(),
      name: organization.getName(),
      slug: organization.getSlug(),
      organizationType: organization.getOrganizationType(),
      status: organization.getStatus(),
      verificationStatus: organization.getVerificationStatus(),
      createdAt: organization.getCreatedAt()
    };
  }
}
