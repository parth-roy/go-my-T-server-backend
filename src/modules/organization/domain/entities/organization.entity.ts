import { OrganizationStatus, OrganizationType, OrgVerifStatus } from '../enums/organization.enum';
import { GstinVO } from '../value-objects/gstin.vo';
import { PanVO } from '../value-objects/pan.vo';
import { SlugVO } from '../value-objects/slug.vo';

export class OrganizationEntity {
  private constructor(
    private readonly id: string,
    private slug: SlugVO,
    private name: string,
    private legalName: string | null,
    private gstin: GstinVO | null,
    private panNumber: PanVO | null,
    private organizationType: OrganizationType,
    private status: OrganizationStatus,
    private verificationStatus: OrgVerifStatus,
    private readonly createdAt: Date,
    private updatedAt: Date,
    private deletedAt: Date | null,
    private readonly createdById: string | null,
    private verifiedById: string | null,
    private verifiedAt: Date | null
  ) {}

  public static reconstitute(
    id: string,
    slugStr: string,
    name: string,
    legalName: string | null,
    gstinStr: string | null,
    panNumberStr: string | null,
    organizationType: OrganizationType,
    status: OrganizationStatus,
    verificationStatus: OrgVerifStatus,
    createdAt: Date,
    updatedAt: Date,
    deletedAt: Date | null,
    createdById: string | null,
    verifiedById: string | null,
    verifiedAt: Date | null
  ): OrganizationEntity {
    return new OrganizationEntity(
      id,
      SlugVO.create(slugStr),
      name,
      legalName,
      GstinVO.create(gstinStr),
      PanVO.create(panNumberStr),
      organizationType,
      status,
      verificationStatus,
      createdAt,
      updatedAt,
      deletedAt,
      createdById,
      verifiedById,
      verifiedAt
    );
  }

  // Domain behavior methods
  public updateDetails(updatedAt: Date, name?: string, legalName?: string | null, type?: OrganizationType, gstin?: GstinVO | null, pan?: PanVO | null): void {
    if (this.status === OrganizationStatus.ARCHIVED) {
      throw new Error('Cannot update an archived organization.');
    }
    
    if (name) this.name = name;
    if (legalName !== undefined) this.legalName = legalName;
    if (type) this.organizationType = type;
    if (gstin !== undefined) this.gstin = gstin;
    if (pan !== undefined) this.panNumber = pan;
    
    this.updatedAt = updatedAt;
  }

  public archive(deletedAt: Date): void {
    if (this.status === OrganizationStatus.ARCHIVED) return;
    this.status = OrganizationStatus.ARCHIVED;
    this.deletedAt = deletedAt;
    this.updatedAt = deletedAt;
  }

  public verify(verifiedById: string, verifiedAt: Date): void {
    if (this.verificationStatus === OrgVerifStatus.VERIFIED) return;
    this.verificationStatus = OrgVerifStatus.VERIFIED;
    this.verifiedById = verifiedById;
    this.verifiedAt = verifiedAt;
    this.updatedAt = verifiedAt;
  }

  // Getters
  public getId(): string { return this.id; }
  public getSlug(): string { return this.slug.getValue(); }
  public getName(): string { return this.name; }
  public getLegalName(): string | null { return this.legalName; }
  public getGstin(): string | null { return this.gstin ? this.gstin.getValue() : null; }
  public getPanNumber(): string | null { return this.panNumber ? this.panNumber.getValue() : null; }
  public getOrganizationType(): OrganizationType { return this.organizationType; }
  public getStatus(): OrganizationStatus { return this.status; }
  public getVerificationStatus(): OrgVerifStatus { return this.verificationStatus; }
  public getCreatedAt(): Date { return this.createdAt; }
  public getUpdatedAt(): Date { return this.updatedAt; }
  public getDeletedAt(): Date | null { return this.deletedAt; }
  public getCreatedById(): string | null { return this.createdById; }
  public getVerifiedById(): string | null { return this.verifiedById; }
  public getVerifiedAt(): Date | null { return this.verifiedAt; }
}
