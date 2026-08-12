import { z } from 'zod';
import { OrganizationRole } from '../../domain/enums/membership.enum';

export const changeMemberRoleSchema = z.object({
  role: z.nativeEnum(OrganizationRole)
});
