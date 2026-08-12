import { BranchEntity } from '../entities/branch.entity';

export interface IBranchRepository {
  findById(organizationId: string, id: string): Promise<BranchEntity | null>;
  findByCode(organizationId: string, code: string): Promise<BranchEntity | null>;
  findByName(organizationId: string, name: string): Promise<BranchEntity | null>;
  existsByCode(organizationId: string, code: string): Promise<boolean>;
  existsByName(organizationId: string, name: string): Promise<boolean>;
  
  create(branch: BranchEntity): Promise<BranchEntity>;
  update(branch: BranchEntity): Promise<BranchEntity>;
  
  // Uses keyset pagination for high performance
  list(
    organizationId: string,
    params: {
      limit: number;
      cursor?: { createdAt: Date; id: string };
      includeArchived?: boolean;
    }
  ): Promise<{ data: BranchEntity[]; hasNextPage: boolean }>;
}
