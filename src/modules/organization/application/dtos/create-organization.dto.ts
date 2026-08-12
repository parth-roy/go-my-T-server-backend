import { OrganizationType } from '../../domain/enums/organization.enum';

export interface CreateOrganizationDTO {
  name: string;
  slug: string;
  organizationType?: OrganizationType;
  legalName?: string;
  gstin?: string;
  panNumber?: string;
}

export interface OrganizationResponseDTO {
  id: string;
  name: string;
  slug: string;
  organizationType: string;
  status: string;
  verificationStatus: string;
  createdAt: Date;
}
