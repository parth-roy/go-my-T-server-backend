export interface CreateBranchDto {
  name: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  country?: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  managerId?: string;
}

export interface UpdateBranchDto {
  name?: string;
  description?: string | null;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  email?: string | null;
  managerId?: string | null;
}

export interface BranchResponseDto {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description: string | null;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  managerId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}
