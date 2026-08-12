import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@shared/db/prisma';
import { IOrganizationRepository } from '../../domain/repositories/organization.repository.interface';
import { OrganizationEntity } from '../../domain/entities/organization.entity';
import { OrganizationStatus, OrganizationType, OrgVerifStatus } from '../../domain/enums/organization.enum';
import { SlugVO } from '../../domain/value-objects/slug.vo';
import { GstinVO } from '../../domain/value-objects/gstin.vo';
import { PanVO } from '../../domain/value-objects/pan.vo';
import { OrganizationSlugAlreadyExistsError, OrganizationGSTINAlreadyExistsError, OrganizationPANAlreadyExistsError } from '@shared/errors/organization.errors';

export class OrganizationRepository implements IOrganizationRepository {
  private db: PrismaClient | Prisma.TransactionClient;

  constructor(transactionClient?: Prisma.TransactionClient) {
    this.db = transactionClient || prisma;
  }

  private mapToDomain(row: any): OrganizationEntity {
    return OrganizationEntity.reconstitute(
      row.id,
      row.slug,
      row.name,
      row.legalName,
      row.gstin,
      row.panNumber,
      row.organizationType as OrganizationType,
      row.status as OrganizationStatus,
      row.verificationStatus as OrgVerifStatus,
      row.createdAt,
      row.updatedAt,
      row.deletedAt,
      row.createdById,
      row.verifiedById,
      row.verifiedAt
    );
  }

  async findById(id: string): Promise<OrganizationEntity | null> {
    const row = await this.db.organization.findUnique({ where: { id } });
    if (!row) return null;
    return this.mapToDomain(row);
  }

  async findBySlug(slug: string): Promise<OrganizationEntity | null> {
    const row = await this.db.organization.findUnique({ where: { slug } });
    if (!row) return null;
    return this.mapToDomain(row);
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const count = await this.db.organization.count({ where: { slug } });
    return count > 0;
  }

  async existsByGSTIN(gstin: string): Promise<boolean> {
    const count = await this.db.organization.count({ where: { gstin } });
    return count > 0;
  }

  async existsByPAN(panNumber: string): Promise<boolean> {
    const count = await this.db.organization.count({ where: { panNumber } });
    return count > 0;
  }

  private handlePrismaError(e: any, entity: OrganizationEntity): never {
    if (e.code === 'P2002') {
      const target = e.meta?.target;
      if (Array.isArray(target)) {
        if (target.includes('slug')) throw new OrganizationSlugAlreadyExistsError(entity.getSlug());
        if (target.includes('gstin')) throw new OrganizationGSTINAlreadyExistsError(entity.getGstin()!);
        if (target.includes('panNumber')) throw new OrganizationPANAlreadyExistsError(entity.getPanNumber()!);
      }
    }
    throw e;
  }

  async create(entity: OrganizationEntity): Promise<OrganizationEntity> {
    try {
      const row = await this.db.organization.create({
        data: {
          id: entity.getId(),
          slug: entity.getSlug(),
          name: entity.getName(),
          legalName: entity.getLegalName(),
          gstin: entity.getGstin(),
          panNumber: entity.getPanNumber(),
          organizationType: entity.getOrganizationType() as any,
          status: entity.getStatus() as any,
          verificationStatus: entity.getVerificationStatus() as any,
          createdAt: entity.getCreatedAt(),
          updatedAt: entity.getUpdatedAt(),
          createdById: entity.getCreatedById(),
        }
      });
      return this.mapToDomain(row);
    } catch (e) {
      this.handlePrismaError(e, entity);
    }
  }

  async update(entity: OrganizationEntity): Promise<OrganizationEntity> {
    try {
      const row = await this.db.organization.update({
        where: { id: entity.getId() },
        data: {
          name: entity.getName(),
          legalName: entity.getLegalName(),
          gstin: entity.getGstin(),
          panNumber: entity.getPanNumber(),
          organizationType: entity.getOrganizationType() as any,
          status: entity.getStatus() as any,
          verificationStatus: entity.getVerificationStatus() as any,
          updatedAt: entity.getUpdatedAt(),
          deletedAt: entity.getDeletedAt(),
          verifiedById: entity.getVerifiedById(),
          verifiedAt: entity.getVerifiedAt()
        }
      });
      return this.mapToDomain(row);
    } catch (e) {
      this.handlePrismaError(e, entity);
    }
  }

  async softDelete(id: string): Promise<void> {
    await this.db.organization.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        deletedAt: new Date()
      }
    });
  }
}
