import { z } from 'zod';
import { DepartmentStatus } from '../../domain/enums/department-status.enum';

export const CreateDepartmentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  code: z.string().min(2).max(10).optional(),
  description: z.string().max(500).optional(),
  managerId: z.string().uuid().optional(),
});

export const UpdateDepartmentSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  managerId: z.string().uuid().optional(),
  status: z.nativeEnum(DepartmentStatus).optional(),
});

export const ListDepartmentsSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  cursor: z.string().uuid().optional(),
  includeArchived: z.preprocess((val) => val === 'true' || val === true, z.boolean().optional()),
  search: z.string().max(100).optional(),
});
