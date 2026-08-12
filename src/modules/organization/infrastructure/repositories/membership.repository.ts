import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@shared/db/prisma';
import { IOrganizationMembershipRepository } from '../../domain/repositories/membership.repository.interface';
import { OrganizationMembershipEntity } from '../../domain/entities/membership.entity';
import { MembershipStatus, OrganizationRole } from '../../domain/enums/membership.enum';

export class OrganizationMembershipRepository implements IOrganizationMembershipRepository {
  private db: PrismaClient | Prisma.TransactionClient;

  constructor(transactionClient?: Prisma.TransactionClient) {
    this.db = transactionClient || prisma;
  }

  private mapToDomain(row: any): OrganizationMembershipEntity {
    return OrganizationMembershipEntity.reconstitute(
      row.id,
      row.organizationId,
      row.userId,
      row.role as OrganizationRole,
      row.status as MembershipStatus,
      row.joinedAt,
      row.createdAt,
      row.updatedAt
    );
  }

  async findById(id: string): Promise<OrganizationMembershipEntity | null> {
    const row = await this.db.organizationMembership.findUnique({ where: { id } });
    if (!row) return null;
    return this.mapToDomain(row);
  }

  async findByUserAndOrg(userId: string, organizationId: string): Promise<OrganizationMembershipEntity | null> {
    const row = await this.db.organizationMembership.findFirst({
      where: { userId, organizationId }
    });
    if (!row) return null;
    return this.mapToDomain(row);
  }

  async findByPhoneAndOrg(phone: string, organizationId: string): Promise<OrganizationMembershipEntity | null> {
    const row = await this.db.organizationMembership.findFirst({
      where: { 
        organizationId,
        user: { phone }
      }
    });
    if (!row) return null;
    return this.mapToDomain(row);
  }

  async findActiveByUserId(userId: string): Promise<OrganizationMembershipEntity[]> {
    const rows = await this.db.organizationMembership.findMany({
      where: { userId, status: 'ACTIVE' }
    });
    return rows.map(r => this.mapToDomain(r));
  }

  async findActiveByOrgId(organizationId: string): Promise<OrganizationMembershipEntity[]> {
    const rows = await this.db.organizationMembership.findMany({
      where: { organizationId, status: 'ACTIVE' }
    });
    return rows.map(r => this.mapToDomain(r));
  }

  async findMany(
    organizationId: string, 
    options: { page: number; limit: number; status?: string; role?: string; search?: string; sort?: string }
  ): Promise<{ data: OrganizationMembershipEntity[]; total: number }> {
    const { page, limit, status, role, search, sort } = options;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (status) where.status = status;
    if (role) where.role = role;
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } }
        ]
      };
    }

    let orderBy: any = { joinedAt: 'desc' };
    if (sort === 'oldest') orderBy = { joinedAt: 'asc' };
    if (sort === 'role') orderBy = { role: 'asc' };

    const [rows, total] = await Promise.all([
      this.db.organizationMembership.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { user: true } // Assuming we might need user details later, but for now just entities
      }),
      this.db.organizationMembership.count({ where })
    ]);

    return {
      data: rows.map(r => this.mapToDomain(r)),
      total
    };
  }

  async create(entity: OrganizationMembershipEntity): Promise<OrganizationMembershipEntity> {
    const row = await this.db.organizationMembership.create({
      data: {
        id: entity.getId(),
        organizationId: entity.getOrganizationId(),
        userId: entity.getUserId(),
        role: entity.getRole() as any,
        status: entity.getStatus() as any,
        joinedAt: entity.getJoinedAt(),
        createdAt: entity.getCreatedAt(),
        updatedAt: entity.getUpdatedAt()
      }
    });
    return this.mapToDomain(row);
  }

  async update(entity: OrganizationMembershipEntity): Promise<OrganizationMembershipEntity> {
    const row = await this.db.organizationMembership.update({
      where: { id: entity.getId() },
      data: {
        role: entity.getRole() as any,
        status: entity.getStatus() as any,
        updatedAt: entity.getUpdatedAt()
      }
    });
    return this.mapToDomain(row);
  }

  async transferPrimaryOwnership(organizationId: string, oldOwnerId: string, newOwnerId: string): Promise<void> {
    // This executes multiple updates. The Application Layer MUST provide a transaction client (tx)
    // to the constructor of this repository for this to be atomic.
    await this.db.organizationMembership.updateMany({
      where: { organizationId, userId: oldOwnerId, role: 'PRIMARY_OWNER' },
      data: { role: 'ORG_ADMIN' }
    });
    await this.db.organizationMembership.updateMany({
      where: { organizationId, userId: newOwnerId },
      data: { role: 'PRIMARY_OWNER' }
    });
  }

  async terminate(id: string): Promise<void> {
    await this.db.organizationMembership.update({
      where: { id },
      data: { status: 'TERMINATED', updatedAt: new Date() }
    });
  }
}
