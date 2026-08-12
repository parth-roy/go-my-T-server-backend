import { DepartmentEntity } from '../entities/department.entity';

export interface ListDepartmentsParams {
  limit: number;
  cursor?: string;
  includeArchived?: boolean;
  search?: string;
}

export interface ListDepartmentsResponse {
  departments: DepartmentEntity[];
  nextCursor?: string;
  hasNextPage: boolean;
}

export interface IDepartmentRepository {
  /**
   * Always enforce organizationId and branchId constraint
   */
  save(entity: DepartmentEntity): Promise<void>;
  
  findById(organizationId: string, branchId: string, id: string): Promise<DepartmentEntity | null>;
  
  findByCode(organizationId: string, branchId: string, code: string): Promise<DepartmentEntity | null>;
  
  findByName(organizationId: string, branchId: string, name: string): Promise<DepartmentEntity | null>;
  
  list(organizationId: string, branchId: string, params: ListDepartmentsParams): Promise<ListDepartmentsResponse>;
}
