import { EmploymentCategory } from '@prisma/client';

export interface CreateEmploymentTypeDto {
  code: string;
  name: string;
  category: EmploymentCategory;
  rulesConfig?: any;
}

export interface UpdateEmploymentTypeDto {
  name?: string;
  category?: EmploymentCategory;
  rulesConfig?: any;
  isActive?: boolean;
}

export interface EmploymentTypeResponseDto {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  category: EmploymentCategory;
  rulesConfig: any;
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
