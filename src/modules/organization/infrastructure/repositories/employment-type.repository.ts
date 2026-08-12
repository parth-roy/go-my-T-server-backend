import { PrismaClient, EmploymentCategory } from '@prisma/client';
import { IEmploymentTypeRepository } from '../../domain/repositories/employment-type.repository.interface';
import { EmploymentTypeEntity, EmploymentTypeProps } from '../../domain/entities/employment-type.entity';

export class PrismaEmploymentTypeRepository implements IEmploymentTypeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toDomain(record: any): EmploymentTypeEntity {
    const props: EmploymentTypeProps = {
      id: record.id,
      organizationId: record.organizationId,
      code: record.code,
      name: record.name,
      category: record.category as EmploymentCategory,
      rulesConfig: record.rulesConfig,
      version: record.version,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    };
    return EmploymentTypeEntity.reconstitute(props);
  }

  async findById(organizationId: string, id: string): Promise<EmploymentTypeEntity | null> {
    const record = await this.prisma.organizationEmploymentType.findUnique({
      where: {
        id,
        organizationId,
      }
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findByCode(organizationId: string, code: string): Promise<EmploymentTypeEntity | null> {
    const record = await this.prisma.organizationEmploymentType.findUnique({
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

  async findByName(organizationId: string, name: string): Promise<EmploymentTypeEntity | null> {
    const record = await this.prisma.organizationEmploymentType.findFirst({
      where: {
        organizationId,
        name
      }
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async list(
    organizationId: string,
    params?: { cursor?: string; limit?: number; includeInactive?: boolean }
  ): Promise<EmploymentTypeEntity[]> {
    const limit = params?.limit || 20;

    const where: any = { organizationId };
    if (!params?.includeInactive) {
      where.isActive = true;
    }

    const records = await this.prisma.organizationEmploymentType.findMany({
      where,
      take: limit,
      ...(params?.cursor && {
        skip: 1,
        cursor: { id: params.cursor }
      }),
      orderBy: { createdAt: 'desc' }
    });

    return records.map(r => this.toDomain(r));
  }

  async save(employmentType: EmploymentTypeEntity): Promise<void> {
    const data = employmentType.toJSON();

    await this.prisma.organizationEmploymentType.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        organizationId: data.organizationId,
        code: data.code,
        name: data.name,
        category: data.category,
        rulesConfig: data.rulesConfig ?? {},
        version: data.version,
        isActive: data.isActive,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        deletedAt: data.deletedAt
      },
      update: {
        name: data.name,
        category: data.category,
        rulesConfig: data.rulesConfig ?? {},
        version: data.version,
        isActive: data.isActive,
        updatedAt: data.updatedAt,
        deletedAt: data.deletedAt
      }
    });
  }
}
