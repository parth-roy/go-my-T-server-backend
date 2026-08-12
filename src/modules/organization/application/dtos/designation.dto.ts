import { DesignationStatus } from '../../domain/enums/designation-status.enum';

export interface CreateDesignationDto {
  name: string;
  code?: string;
  description?: string;
  level?: number;
}

export interface UpdateDesignationDto {
  name?: string;
  description?: string;
  level?: number;
  status?: DesignationStatus;
}

export interface DesignationResponseDto {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description: string | null;
  level: number | null;
  status: DesignationStatus;
  createdAt: Date;
  updatedAt: Date;
}
