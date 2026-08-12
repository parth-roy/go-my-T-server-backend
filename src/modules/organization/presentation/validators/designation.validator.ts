import { z } from 'zod';
import { DesignationStatus } from '../../domain/enums/designation-status.enum';

export const createDesignationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  code: z.string().max(20).optional(),
  description: z.string().max(500).optional().nullable(),
  level: z.number().int().min(1).max(100).optional().nullable(),
});

export const updateDesignationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  level: z.number().int().min(1).max(100).optional().nullable(),
  status: z.nativeEnum(DesignationStatus).optional()
});

export const designationIdParamSchema = z.object({
  designationId: z.string().uuid('Invalid designation ID')
});

export const listDesignationsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  includeArchived: z.coerce.boolean().optional().default(false),
});
