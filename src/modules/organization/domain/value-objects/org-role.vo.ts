import { OrganizationRole } from '../enums/membership.enum';
import { AppError } from '@shared/errors/AppError';

export class OrgRole {
  public readonly value: OrganizationRole;

  constructor(value: string) {
    if (!Object.values(OrganizationRole).includes(value as OrganizationRole)) {
      throw AppError.badRequest(`Invalid organization role: ${value}`);
    }
    this.value = value as OrganizationRole;
  }
}
