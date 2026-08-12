export class CreateWorkerComplianceDto {
  workerId!: string;
  organizationId!: string;
}

export class AddWorkerCredentialDto {
  workerId!: string;
  type!: string;
  credentialData!: Record<string, any>;
  expiryDate?: Date;
}

export class VerifyWorkerCredentialDto {
  workerId!: string;
  credentialId!: string;
  verificationSource!: string;
  confidenceScore!: number;
  auditDetails!: Record<string, any>;
}

export class RevokeWorkerCredentialDto {
  workerId!: string;
  credentialId!: string;
  reason!: string;
}

export class GrantComplianceExemptionDto {
  workerId!: string;
  type!: string;
  reason!: string;
  grantedBy!: string;
  expiresAt!: Date;
}

export class EvaluateWorkerComplianceDto {
  workerId!: string;
}
