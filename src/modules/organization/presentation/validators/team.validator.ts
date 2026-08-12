import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(50).optional(),
  description: z.string().max(500).optional(),
  leaderId: z.string().uuid().optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  leaderId: z.string().uuid().optional().nullable(),
});

export const listTeamsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
  search: z.string().optional(),
  includeArchived: z.enum(['true', 'false']).transform(val => val === 'true').optional().default('false' as any),
});
