import { PrismaClient, OrganizationDepartment } from '@prisma/client';
import { DepartmentEntity, DepartmentProps } from '../../domain/entities/department.entity';
import { IDepartmentRepository, ListDepartmentsParams, ListDepartmentsResponse } from '../../domain/repositories/department.repository.interface';
import { DepartmentStatus as DomainDepartmentStatus } from '../../domain/enums/department-status.enum';
import { DepartmentStatus as PrismaDepartmentStatus } from '@prisma/client';

export class PrismaDepartmentRepository implements IDepartmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toDomain(model: OrganizationDepartment): DepartmentEntity {
    const props: DepartmentProps = {
      id: model.id,
      organizationId: model.organizationId,
      branchId: model.branchId,
      name: model.name,
      code: model.code,
      description: model.description,
      managerId: model.managerId,
      status: model.status as DomainDepartmentStatus,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      deletedAt: model.deletedAt,
    };
    return DepartmentEntity.reconstitute(props);
  }

  async save(entity: DepartmentEntity): Promise<void> {
    const data = entity.toJSON();
    await this.prisma.organizationDepartment.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        organizationId: data.organizationId,
        branchId: data.branchId,
        name: data.name,
        code: data.code,
        description: data.description,
        managerId: data.managerId,
        status: data.status as PrismaDepartmentStatus,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        deletedAt: data.deletedAt,
      },
      update: {
        name: data.name,
        code: data.code,
        description: data.description,
        managerId: data.managerId,
        status: data.status as PrismaDepartmentStatus,
        updatedAt: data.updatedAt,
        deletedAt: data.deletedAt,
      },
    });
  }

  async findById(organizationId: string, branchId: string, id: string): Promise<DepartmentEntity | null> {
    const model = await this.prisma.organizationDepartment.findFirst({
      where: {
        id,
        organizationId,
        branchId,
      },
    });
    return model ? this.toDomain(model) : null;
  }

  async findByCode(organizationId: string, branchId: string, code: string): Promise<DepartmentEntity | null> {
    const model = await this.prisma.organizationDepartment.findFirst({
      where: {
        code,
        organizationId,
        branchId,
      },
    });
    return model ? this.toDomain(model) : null;
  }

  async findByName(organizationId: string, branchId: string, name: string): Promise<DepartmentEntity | null> {
    const model = await this.prisma.organizationDepartment.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
        organizationId,
        branchId,
      },
    });
    return model ? this.toDomain(model) : null;
  }

  async list(organizationId: string, branchId: string, params: ListDepartmentsParams): Promise<ListDepartmentsResponse> {
    const limit = params.limit;
    
    let whereClause: any = {
      organizationId,
      branchId,
    };

    if (!params.includeArchived) {
      whereClause.status = {
        not: PrismaDepartmentStatus.ARCHIVED,
      };
    }

    if (params.search) {
      whereClause.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const items = await this.prisma.organizationDepartment.findMany({
      where: whereClause,
      take: limit + 1, // Fetch one extra to determine hasNextPage
      skip: params.cursor ? 1 : 0,
      cursor: params.cursor ? { id: params.cursor } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    let hasNextPage = false;
    if (items.length > limit) {
      hasNextPage = true;
      items.pop(); // Remove the extra item
    }

    const nextCursor = hasNextPage && items.length > 0 ? items[items.length - 1].id : undefined;

    return {
      departments: items.map((item) => this.toDomain(item)),
      nextCursor,
      hasNextPage,
    };
  }
}
