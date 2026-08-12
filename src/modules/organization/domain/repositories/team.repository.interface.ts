import { TeamEntity } from '../entities/team.entity';

export interface ITeamRepository {
  findById(organizationId: string, branchId: string, departmentId: string, id: string): Promise<TeamEntity | null>;
  findByCode(organizationId: string, branchId: string, departmentId: string, code: string): Promise<TeamEntity | null>;
  findByName(organizationId: string, branchId: string, departmentId: string, name: string): Promise<TeamEntity | null>;
  existsByCode(organizationId: string, branchId: string, departmentId: string, code: string): Promise<boolean>;
  existsByName(organizationId: string, branchId: string, departmentId: string, name: string): Promise<boolean>;
  
  create(team: TeamEntity): Promise<TeamEntity>;
  update(team: TeamEntity): Promise<TeamEntity>;
  
  list(
    organizationId: string,
    branchId: string,
    departmentId: string,
    params: {
      limit: number;
      cursor?: { createdAt: Date; id: string };
      search?: string;
      includeArchived?: boolean;
    }
  ): Promise<{ data: TeamEntity[]; hasNextPage: boolean }>;
}
