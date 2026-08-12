import { PrismaClient, OrganizationBranch, Prisma } from '@prisma/client';
import { IBranchRepository } from '../../domain/repositories/branch.repository.interface';
import { BranchEntity } from '../../domain/entities/branch.entity';
import { BranchStatus } from '../../domain/enums/branch.enum';

export class PrismaBranchRepository implements IBranchRepository {
  constructor(private readonly prisma: PrismaClient | Prisma.TransactionClient) {}

  private toDomain(record: OrganizationBranch): BranchEntity {
    return BranchEntity.reconstitute(
      record.id,
      record.organizationId,
      record.name,
      record.code,
      record.description,
      record.address,
      record.city,
      record.state,
      record.country,
      record.postalCode,
      record.latitude,
      record.longitude,
      record.phone,
      record.email,
      record.managerId,
      record.status as BranchStatus,
      record.createdAt,
      record.updatedAt,
      record.deletedAt
    );
  }

  private toPersistence(entity: BranchEntity): any {
    return {
      id: entity.getId(),
      organizationId: entity.getOrganizationId(),
      name: entity.getName(),
      code: entity.getCode(),
      description: entity.getDescription(),
      address: entity.getAddress(),
      city: entity.getCity(),
      state: entity.getState(),
      country: entity.getCountry(),
      postalCode: entity.getPostalCode(),
      latitude: entity.getLatitude(),
      longitude: entity.getLongitude(),
      phone: entity.getPhone(),
      email: entity.getEmail(),
      managerId: entity.getManagerId(),
      status: entity.getStatus(),
      createdAt: entity.getCreatedAt(),
      updatedAt: entity.getUpdatedAt(),
      deletedAt: entity.getDeletedAt(),
    };
  }

  async findById(organizationId: string, id: string): Promise<BranchEntity | null> {
    const record = await this.prisma.organizationBranch.findUnique({
      where: { id },
    });
    if (!record || record.organizationId !== organizationId) return null;
    return this.toDomain(record);
  }

  async findByCode(organizationId: string, code: string): Promise<BranchEntity | null> {
    const record = await this.prisma.organizationBranch.findFirst({
      where: { organizationId, code, deletedAt: null },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByName(organizationId: string, name: string): Promise<BranchEntity | null> {
    const record = await this.prisma.organizationBranch.findFirst({
      where: {
        organizationId,
        name: { equals: name, mode: 'insensitive' },
        deletedAt: null,
      },
    });
    return record ? this.toDomain(record) : null;
  }

  async existsByCode(organizationId: string, code: string): Promise<boolean> {
    const count = await this.prisma.organizationBranch.count({
      where: { organizationId, code, deletedAt: null },
    });
    return count > 0;
  }

  async existsByName(organizationId: string, name: string): Promise<boolean> {
    const count = await this.prisma.organizationBranch.count({
      where: {
        organizationId,
        name: { equals: name, mode: 'insensitive' },
        deletedAt: null,
      },
    });
    return count > 0;
  }

  async create(branch: BranchEntity): Promise<BranchEntity> {
    const data = this.toPersistence(branch);
    const created = await this.prisma.organizationBranch.create({ data });
    return this.toDomain(created);
  }

  async update(branch: BranchEntity): Promise<BranchEntity> {
    const data = this.toPersistence(branch);
    
    const updated = await this.prisma.organizationBranch.update({
      where: { id: branch.getId() },
      data,
    });
    
    return this.toDomain(updated);
  }

  async list(
    organizationId: string,
    params: { limit: number; cursor?: { createdAt: Date; id: string }; includeArchived?: boolean }
  ): Promise<{ data: BranchEntity[]; hasNextPage: boolean }> {
    const where: Prisma.OrganizationBranchWhereInput = {
      organizationId,
      ...(params.includeArchived ? {} : { deletedAt: null }),
    };

    const records = await this.prisma.organizationBranch.findMany({
      where,
      take: params.limit + 1,
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      cursor: params.cursor ? {
        id: params.cursor.id,
      } : undefined,
    });

    const hasNextPage = records.length > params.limit;
    const data = hasNextPage ? records.slice(0, -1) : records;

    return {
      data: data.map((r: any) => this.toDomain(r)),
      hasNextPage,
    };
  }
}
