import { OrganizationType } from '../../domain/enums/organization.enum';
export interface UpdateOrganizationDTO {
  name?: string;
  legalName?: string;
  organizationType?: OrganizationType;
  gstin?: string;
  panNumber?: string;
}
