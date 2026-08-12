import { DesignationEntity } from '../entities/designation.entity';

export interface IDesignationRepository {
  findById(organizationId: string, id: string): Promise<DesignationEntity | null>;
  findByCode(organizationId: string, code: string): Promise<DesignationEntity | null>;
  findByName(organizationId: string, name: string): Promise<DesignationEntity | null>;
  list(
    organizationId: string,
    params: {
      cursor?: string;
      limit?: number;
      includeArchived?: boolean;
    }
  ): Promise<{ data: DesignationEntity[]; nextCursor?: string }>;
  save(designation: DesignationEntity): Promise<void>;
}
