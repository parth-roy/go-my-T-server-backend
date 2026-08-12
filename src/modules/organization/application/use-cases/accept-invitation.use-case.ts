import { randomUUID } from 'crypto';
import { prisma } from '@shared/db/prisma';
import { IInvitationRepository } from '../../domain/repositories/invitation.repository.interface';
import { IOrganizationMembershipRepository } from '../../domain/repositories/membership.repository.interface';
import { OrganizationMembershipInvitation } from '../../domain/aggregates/invitation.aggregate';
import { MembershipFactory } from '../../domain/factories/membership.factory';
import { AppError } from '@shared/errors/AppError';
import { InvitationRepository } from '../../infrastructure/repositories/invitation.repository';
import { OrganizationMembershipRepository } from '../../infrastructure/repositories/membership.repository';
import { InvitationAcceptedEvent } from '../../domain/events/invitation-accepted.event';
import { OrganizationMemberJoinedEvent } from '../../domain/events/organization-member-joined.event';
// import { IEventDispatcher } from '@shared/events/event-dispatcher.interface';

export class AcceptInvitationUseCase {
  constructor(
    private readonly invitationRepo: IInvitationRepository,
    private readonly membershipRepo: IOrganizationMembershipRepository,
    // private readonly eventDispatcher: IEventDispatcher
  ) {}

  async execute(rawToken: string, userId: string, authenticatedPhone: string): Promise<void> {
    const tokenHash = OrganizationMembershipInvitation.hashToken(rawToken);
    const invitation = await this.invitationRepo.findByTokenHash(tokenHash);

    if (!invitation) {
      throw AppError.notFound('Invitation not found or invalid');
    }

    if (invitation.phone !== authenticatedPhone) {
      throw AppError.forbidden('This invitation was sent to a different phone number');
    }

    // Check if membership already exists (Idempotency)
    const existingMembership = await this.membershipRepo.findByPhoneAndOrg(authenticatedPhone, invitation.organizationId);
    if (existingMembership && existingMembership.getStatus() === 'ACTIVE') {
      if (invitation.status === 'ACCEPTED') {
        // Idempotent success
        return;
      }
      throw AppError.conflict('You are already an active member of this organization');
    }

    // Domain Invariants Check
    // The aggregate validates PENDING and EXPIRED constraints
    invitation.accept();

    const newMembershipId = randomUUID();
    const joinedAt = new Date();
    const membership = MembershipFactory.create(
      newMembershipId,
      invitation.organizationId,
      userId,
      invitation.role.value,
      joinedAt
    );

    // Transactional boundaries
    await prisma.$transaction(async (tx) => {
      const txInvitationRepo = new InvitationRepository(tx);
      const txMembershipRepo = new OrganizationMembershipRepository(tx);

      // Save aggregate changes
      await txInvitationRepo.save(invitation);
      await txMembershipRepo.create(membership);
    });

    // Domain events publishing
    const acceptedEvent = new InvitationAcceptedEvent(
      invitation.id,
      invitation.organizationId,
      userId,
      joinedAt
    );
    const memberJoinedEvent = new OrganizationMemberJoinedEvent(
      membership.getId(),
      membership.getOrganizationId(),
      userId,
      invitation.role,
      joinedAt
    );

    // this.eventDispatcher.dispatch(acceptedEvent);
    // this.eventDispatcher.dispatch(memberJoinedEvent);
    console.log('[EVENT]', 'InvitationAcceptedEvent dispatched for', userId);
    console.log('[EVENT]', 'OrganizationMemberJoinedEvent dispatched for', userId);
  }
}
