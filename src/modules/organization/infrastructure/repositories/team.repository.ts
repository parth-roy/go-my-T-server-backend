import { PrismaClient, OrganizationTeam, Prisma } from '@prisma/client';
import { ITeamRepository } from '../../domain/repositories/team.repository.interface';
import { TeamEntity, TeamProps } from '../../domain/entities/team.entity';
import { TeamStatus } from '../../domain/enums/team-status.enum';

export class PrismaTeamRepository implements ITeamRepository {
  constructor(private readonly prisma: PrismaClient | Prisma.TransactionClient) {}

  private toDomain(row: OrganizationTeam): TeamEntity {
    return TeamEntity.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      branchId: row.branchId,
      departmentId: row.departmentId,
      name: row.name,
      code: row.code,
      description: row.description,
      leaderId: row.leaderId,
      status: row.status as TeamStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt
    });
  }

  async findById(organizationId: string, branchId: string, departmentId: string, id: string): Promise<TeamEntity | null> {
    const row = await this.prisma.organizationTeam.findUnique({
      where: { id }
    });
    if (!row || row.organizationId !== organizationId || row.branchId !== branchId || row.departmentId !== departmentId) return null;
    return this.toDomain(row);
  }

  async findByCode(organizationId: string, branchId: string, departmentId: string, code: string): Promise<TeamEntity | null> {
    const row = await this.prisma.organizationTeam.findUnique({
      where: {
        departmentId_code: { departmentId, code }
      }
    });
    if (!row || row.organizationId !== organizationId || row.branchId !== branchId) return null;
    return this.toDomain(row);
  }

  async findByName(organizationId: string, branchId: string, departmentId: string, name: string): Promise<TeamEntity | null> {
    const row = await this.prisma.organizationTeam.findUnique({
      where: {
        departmentId_name: { departmentId, name }
      }
    });
    if (!row || row.organizationId !== organizationId || row.branchId !== branchId) return null;
    return this.toDomain(row);
  }

  async existsByCode(organizationId: string, branchId: string, departmentId: string, code: string): Promise<boolean> {
    const count = await this.prisma.organizationTeam.count({
      where: { departmentId, code, branchId, organizationId }
    });
    return count > 0;
  }

  async existsByName(organizationId: string, branchId: string, departmentId: string, name: string): Promise<boolean> {
    const count = await this.prisma.organizationTeam.count({
      where: { departmentId, name, branchId, organizationId }
    });
    return count > 0;
  }

  async create(team: TeamEntity): Promise<TeamEntity> {
    const row = await this.prisma.organizationTeam.create({
      data: {
        id: team.getId(),
        organizationId: team.getOrganizationId(),
        branchId: team.getBranchId(),
        departmentId: team.getDepartmentId(),
        name: team.getName(),
        code: team.getCode(),
        description: team.getDescription(),
        leaderId: team.getLeaderId(),
        status: team.getStatus(),
        createdAt: team.getCreatedAt(),
        updatedAt: team.getUpdatedAt(),
        deletedAt: team.getDeletedAt()
      }
    });
    return this.toDomain(row);
  }

  async update(team: TeamEntity): Promise<TeamEntity> {
    const row = await this.prisma.organizationTeam.update({
      where: { id: team.getId() },
      data: {
        name: team.getName(),
        description: team.getDescription(),
        leaderId: team.getLeaderId(),
        status: team.getStatus(),
        updatedAt: team.getUpdatedAt(),
        deletedAt: team.getDeletedAt()
      }
    });
    return this.toDomain(row);
  }

  async list(
    organizationId: string,
    branchId: string,
    departmentId: string,
    params: {
      limit: number;
      cursor?: { createdAt: Date; id: string };
      search?: string;
      includeArchived?: boolean;
    }
  ): Promise<{ data: TeamEntity[]; hasNextPage: boolean }> {
    const where: any = {
      organizationId,
      branchId,
      departmentId
    };

    if (!params.includeArchived) {
      where.status = { not: 'ARCHIVED' };
      where.deletedAt = null;
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } }
      ];
    }

    const rows = await this.prisma.organizationTeam.findMany({
      where,
      take: params.limit + 1,
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' }
      ],
      cursor: params.cursor ? {
        id: params.cursor.id
      } : undefined,
    });

    const hasNextPage = rows.length > params.limit;
    const data = hasNextPage ? rows.slice(0, -1) : rows;

    return {
      data: data.map(r => this.toDomain(r)),
      hasNextPage
    };
  }
}
