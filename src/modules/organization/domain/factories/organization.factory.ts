import { OrganizationEntity } from '../entities/organization.entity';
import { OrganizationStatus, OrganizationType, OrgVerifStatus } from '../enums/organization.enum';
import { SlugVO } from '../value-objects/slug.vo';
import { GstinVO } from '../value-objects/gstin.vo';
import { PanVO } from '../value-objects/pan.vo';

export class OrganizationFactory {
  /**
   * Creates a brand new Organization entity adhering to business invariants.
   * IDs and timestamps must be provided by the Application layer (e.g., UOW/Command Handler)
   * to keep the Domain pure from infrastructure concerns.
   */
  public static create(
    id: string,
    slugStr: string,
    name: string,
    legalName: string | null,
    gstinStr: string | null,
    panNumberStr: string | null,
    organizationType: OrganizationType,
    createdById: string,
    createdAt: Date
  ): OrganizationEntity {
    // Value Object Validation
    const slug = SlugVO.create(slugStr);
    const gstin = GstinVO.create(gstinStr);
    const pan = PanVO.create(panNumberStr);

    return OrganizationEntity.reconstitute(
      id,
      slug.getValue(),
      name,
      legalName,
      gstin?.getValue() || null,
      pan?.getValue() || null,
      organizationType,
      OrganizationStatus.PENDING,
      OrgVerifStatus.PENDING,
      createdAt,
      createdAt,
      null, // deletedAt
      createdById,
      null, // verifiedById
      null  // verifiedAt
    );
  }
}
