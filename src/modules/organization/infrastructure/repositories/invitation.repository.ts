import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@shared/db/prisma';
import { IInvitationRepository } from '../../domain/repositories/invitation.repository.interface';
import { OrganizationMembershipInvitation, InvitationStatus } from '../../domain/aggregates/invitation.aggregate';
import { OrgRole } from '../../domain/value-objects/org-role.vo';
import { AppError } from '@shared/errors/AppError';

export class InvitationRepository implements IInvitationRepository {
  private db: PrismaClient | Prisma.TransactionClient;

  constructor(transactionClient?: Prisma.TransactionClient) {
    this.db = transactionClient || prisma;
  }

  private mapToDomain(row: any): OrganizationMembershipInvitation {
    return OrganizationMembershipInvitation.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      phone: row.phone,
      email: row.email,
      role: new OrgRole(row.role),
      tokenHash: row.tokenHash,
      status: row.status as InvitationStatus,
      capabilitySnapshot: row.capabilitySnapshot,
      expiresAt: row.expiresAt,
      inviterId: row.inviterId
    });
  }

  async save(invitation: OrganizationMembershipInvitation, tx?: any): Promise<void> {
    const db = tx || this.db;
    try {
      await db.organizationMembershipInvitation.upsert({
        where: { id: invitation.id },
        update: {
          tokenHash: invitation.tokenHash,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          updatedAt: new Date()
        },
        create: {
          id: invitation.id,
          organizationId: invitation.organizationId,
          phone: invitation.phone,
          email: invitation.email,
          role: invitation.role.value as any,
          tokenHash: invitation.tokenHash,
          status: invitation.status as any,
          capabilitySnapshot: invitation.capabilitySnapshot,
          expiresAt: invitation.expiresAt,
          inviterId: invitation.inviterId
        }
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw AppError.conflict('An active invitation for this phone number already exists.');
      }
      throw error;
    }
  }

  async findPendingByPhone(organizationId: string, phone: string, tx?: any): Promise<OrganizationMembershipInvitation | null> {
    const db = tx || this.db;
    const row = await db.organizationMembershipInvitation.findFirst({
      where: {
        organizationId,
        phone,
        status: 'PENDING'
      }
    });

    if (!row) return null;
    return this.mapToDomain(row);
  }

  async findByTokenHash(tokenHash: string, tx?: any): Promise<OrganizationMembershipInvitation | null> {
    const db = tx || this.db;
    const row = await db.organizationMembershipInvitation.findUnique({
      where: { tokenHash }
    });

    if (!row) return null;
    return this.mapToDomain(row);
  }
}
