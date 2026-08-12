import { DepartmentStatus } from '../../domain/enums/department-status.enum';

export interface CreateDepartmentDto {
  name: string;
  code?: string; // Optional preferred code
  description?: string;
  managerId?: string;
}

export interface UpdateDepartmentDto {
  name?: string;
  description?: string;
  managerId?: string;
  status?: DepartmentStatus;
}

export interface DepartmentResponseDto {
  id: string;
  organizationId: string;
  branchId: string;
  name: string;
  code: string;
  description: string | null;
  managerId: string | null;
  status: DepartmentStatus;
  createdAt: Date;
  updatedAt: Date;
}
