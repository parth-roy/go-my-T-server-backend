import { PrismaClient } from '@prisma/client';
import { IDesignationRepository } from '../../domain/repositories/designation.repository.interface';
import { DesignationEntity, DesignationProps } from '../../domain/entities/designation.entity';
import { DesignationStatus } from '../../domain/enums/designation-status.enum';

export class PrismaDesignationRepository implements IDesignationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toDomain(record: any): DesignationEntity {
    const props: DesignationProps = {
      id: record.id,
      organizationId: record.organizationId,
      name: record.name,
      code: record.code,
      description: record.description,
      level: record.level,
      status: record.status as DesignationStatus,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    };
    return DesignationEntity.reconstitute(props);
  }

  async findById(organizationId: string, id: string): Promise<DesignationEntity | null> {
    const record = await this.prisma.organizationDesignation.findUnique({
      where: {
        id,
        organizationId,
      }
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findByCode(organizationId: string, code: string): Promise<DesignationEntity | null> {
    const record = await this.prisma.organizationDesignation.findUnique({
      where: {
        organizationId_code: {
          organizationId,
          code
        }
      }
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findByName(organizationId: string, name: string): Promise<DesignationEntity | null> {
    const record = await this.prisma.organizationDesignation.findUnique({
      where: {
        organizationId_name: {
          organizationId,
          name
        }
      }
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async list(
    organizationId: string,
    params: { cursor?: string; limit?: number; includeArchived?: boolean }
  ): Promise<{ data: DesignationEntity[]; nextCursor?: string }> {
    const limit = params.limit || 20;

    const where: any = { organizationId };
    if (!params.includeArchived) {
      where.status = { not: 'ARCHIVED' };
    }

    const records = await this.prisma.organizationDesignation.findMany({
      where,
      take: limit + 1,
      ...(params.cursor && {
        skip: 1,
        cursor: { id: params.cursor }
      }),
      orderBy: { createdAt: 'desc' }
    });

    let nextCursor: string | undefined;
    if (records.length > limit) {
      const nextItem = records.pop();
      nextCursor = nextItem!.id;
    }

    return {
      data: records.map(r => this.toDomain(r)),
      nextCursor
    };
  }

  async save(designation: DesignationEntity): Promise<void> {
    const data = designation.toJSON();

    await this.prisma.organizationDesignation.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        organizationId: data.organizationId,
        name: data.name,
        code: data.code,
        description: data.description,
        level: data.level,
        status: data.status,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        deletedAt: data.deletedAt
      },
      update: {
        name: data.name,
        code: data.code,
        description: data.description,
        level: data.level,
        status: data.status,
        updatedAt: data.updatedAt,
        deletedAt: data.deletedAt
      }
    });
  }
}
