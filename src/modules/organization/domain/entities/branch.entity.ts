import { BranchStatus } from '../enums/branch.enum';

export class BranchEntity {
  private constructor(
    private readonly id: string,
    private readonly organizationId: string,
    private name: string,
    private code: string,
    private description: string | null,
    private address: string,
    private city: string,
    private state: string,
    private country: string,
    private postalCode: string,
    private latitude: number | null,
    private longitude: number | null,
    private phone: string | null,
    private email: string | null,
    private managerId: string | null,
    private status: BranchStatus,
    private readonly createdAt: Date,
    private updatedAt: Date,
    private deletedAt: Date | null
  ) {}

  public static reconstitute(
    id: string,
    organizationId: string,
    name: string,
    code: string,
    description: string | null,
    address: string,
    city: string,
    state: string,
    country: string,
    postalCode: string,
    latitude: number | null,
    longitude: number | null,
    phone: string | null,
    email: string | null,
    managerId: string | null,
    status: BranchStatus,
    createdAt: Date,
    updatedAt: Date,
    deletedAt: Date | null
  ): BranchEntity {
    return new BranchEntity(
      id,
      organizationId,
      name,
      code,
      description,
      address,
      city,
      state,
      country,
      postalCode,
      latitude,
      longitude,
      phone,
      email,
      managerId,
      status,
      createdAt,
      updatedAt,
      deletedAt
    );
  }

  // Domain behavior methods
  public updateDetails(
    updatedAt: Date,
    name?: string,
    description?: string | null,
    address?: string,
    city?: string,
    state?: string,
    country?: string,
    postalCode?: string,
    latitude?: number | null,
    longitude?: number | null,
    phone?: string | null,
    email?: string | null,
    managerId?: string | null
  ): void {
    if (this.status === BranchStatus.ARCHIVED || this.deletedAt !== null) {
      throw new Error('Cannot update an archived branch.');
    }
    
    if (name !== undefined) this.name = name;
    if (description !== undefined) this.description = description;
    if (address !== undefined) this.address = address;
    if (city !== undefined) this.city = city;
    if (state !== undefined) this.state = state;
    if (country !== undefined) this.country = country;
    if (postalCode !== undefined) this.postalCode = postalCode;
    if (latitude !== undefined) this.latitude = latitude;
    if (longitude !== undefined) this.longitude = longitude;
    if (phone !== undefined) this.phone = phone;
    if (email !== undefined) this.email = email;
    if (managerId !== undefined) this.managerId = managerId;
    
    this.updatedAt = updatedAt;
  }

  public archive(deletedAt: Date): void {
    if (this.status === BranchStatus.ARCHIVED) return;
    this.status = BranchStatus.ARCHIVED;
    this.deletedAt = deletedAt;
    this.updatedAt = deletedAt;
  }

  // Getters
  public getId(): string { return this.id; }
  public getOrganizationId(): string { return this.organizationId; }
  public getName(): string { return this.name; }
  public getCode(): string { return this.code; }
  public getDescription(): string | null { return this.description; }
  public getAddress(): string { return this.address; }
  public getCity(): string { return this.city; }
  public getState(): string { return this.state; }
  public getCountry(): string { return this.country; }
  public getPostalCode(): string { return this.postalCode; }
  public getLatitude(): number | null { return this.latitude; }
  public getLongitude(): number | null { return this.longitude; }
  public getPhone(): string | null { return this.phone; }
  public getEmail(): string | null { return this.email; }
  public getManagerId(): string | null { return this.managerId; }
  public getStatus(): BranchStatus { return this.status; }
  public getCreatedAt(): Date { return this.createdAt; }
  public getUpdatedAt(): Date { return this.updatedAt; }
  public getDeletedAt(): Date | null { return this.deletedAt; }
}
