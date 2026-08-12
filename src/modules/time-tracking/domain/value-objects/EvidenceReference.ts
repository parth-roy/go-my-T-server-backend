export enum EvidenceType {
  PHOTO = 'PHOTO',
  GEO = 'GEO',
  BIOMETRIC = 'BIOMETRIC',
  MANAGER_NOTE = 'MANAGER_NOTE'
}

export interface EvidenceReference {
  readonly type: EvidenceType;
  readonly url?: string;
  readonly metadata?: Record<string, any>;
  readonly createdAt: Date;
}

export class PhotoEvidence implements EvidenceReference {
  public readonly type = EvidenceType.PHOTO;
  public readonly createdAt: Date;

  constructor(
    public readonly url: string,
    public readonly metadata?: { mimeType?: string; sizeBytes?: number },
    createdAt?: Date
  ) {
    this.createdAt = createdAt || new Date();
  }
}

export class GeoEvidence implements EvidenceReference {
  public readonly type = EvidenceType.GEO;
  public readonly createdAt: Date;

  constructor(
    public readonly lat: number,
    public readonly lng: number,
    public readonly accuracyMeters?: number,
    createdAt?: Date
  ) {
    this.createdAt = createdAt || new Date();
  }

  get metadata() {
    return { lat: this.lat, lng: this.lng, accuracyMeters: this.accuracyMeters };
  }
}

export class BiometricEvidence implements EvidenceReference {
  public readonly type = EvidenceType.BIOMETRIC;
  public readonly createdAt: Date;

  constructor(
    public readonly url: string,
    public readonly metadata?: { matchScore?: number; algorithm?: string },
    createdAt?: Date
  ) {
    this.createdAt = createdAt || new Date();
  }
}

export class ManagerNoteEvidence implements EvidenceReference {
  public readonly type = EvidenceType.MANAGER_NOTE;
  public readonly createdAt: Date;

  constructor(
    public readonly noteText: string,
    public readonly authorId: string,
    createdAt?: Date
  ) {
    this.createdAt = createdAt || new Date();
  }

  get metadata() {
    return { noteText: this.noteText, authorId: this.authorId };
  }
}
