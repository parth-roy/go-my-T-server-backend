import { TeamStatus } from '../../domain/enums/team-status.enum';

export interface CreateTeamDto {
  name: string;
  code?: string;
  description?: string;
  leaderId?: string;
}

export interface UpdateTeamDto {
  name?: string;
  description?: string;
  leaderId?: string | null;
}

export interface TeamResponseDto {
  id: string;
  organizationId: string;
  branchId: string;
  departmentId: string;
  name: string;
  code: string;
  description: string | null;
  leaderId: string | null;
  status: TeamStatus;
  createdAt: Date;
  updatedAt: Date;
}
