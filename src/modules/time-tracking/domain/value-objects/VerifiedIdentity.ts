export enum VerificationMethod {
  GPS = 'GPS',
  BIOMETRIC_FINGERPRINT = 'BIOMETRIC_FINGERPRINT',
  BIOMETRIC_FACE = 'BIOMETRIC_FACE',
  QR_SCAN = 'QR_SCAN',
  SUPERVISOR_OVERRIDE = 'SUPERVISOR_OVERRIDE',
  SYSTEM_AUTO = 'SYSTEM_AUTO'
}

export interface LocationEvidence {
  latitude: number;
  longitude: number;
  accuracy: number;
  spoofingDetected: boolean;
}

export interface DeviceEvidence {
  deviceId: string;
  platform: string;
  appVersion: string;
}

export interface VerificationResult {
  status: 'VERIFIED' | 'FAILED' | 'MANUAL_REVIEW';
  confidenceScore: number;
}

export class VerifiedIdentity {
  private constructor(
    public readonly method: VerificationMethod,
    public readonly location: LocationEvidence | null,
    public readonly device: DeviceEvidence | null,
    public readonly result: VerificationResult,
    public readonly timestamp: Date
  ) {}

  public static create(
    method: VerificationMethod,
    result: VerificationResult,
    location: LocationEvidence | null = null,
    device: DeviceEvidence | null = null
  ): VerifiedIdentity {
    return new VerifiedIdentity(method, location, device, result, new Date());
  }

  public toJSON() {
    return {
      method: this.method,
      location: this.location,
      device: this.device,
      result: this.result,
      timestamp: this.timestamp.toISOString()
    };
  }

  public static fromJSON(json: any): VerifiedIdentity {
    return new VerifiedIdentity(
      json.method,
      json.location,
      json.device,
      json.result,
      new Date(json.timestamp)
    );
  }
}
