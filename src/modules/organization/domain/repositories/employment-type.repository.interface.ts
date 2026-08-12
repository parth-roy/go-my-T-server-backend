import { EmploymentTypeEntity } from '../entities/employment-type.entity';

export interface IEmploymentTypeRepository {
  save(employmentType: EmploymentTypeEntity): Promise<void>;
  findById(organizationId: string, id: string): Promise<EmploymentTypeEntity | null>;
  findByCode(organizationId: string, code: string): Promise<EmploymentTypeEntity | null>;
  findByName(organizationId: string, name: string): Promise<EmploymentTypeEntity | null>;
  list(organizationId: string, options?: { cursor?: string; limit?: number; includeInactive?: boolean }): Promise<EmploymentTypeEntity[]>;
}
