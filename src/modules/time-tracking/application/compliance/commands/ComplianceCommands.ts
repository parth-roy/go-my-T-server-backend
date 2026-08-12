export class CreateWorkerComplianceCommand {
  constructor(
    public readonly workerId: string,
    public readonly organizationId: string
  ) {}
}

export class AddWorkerCredentialCommand {
  constructor(
    public readonly workerId: string,
    public readonly type: string,
    public readonly credentialData: Record<string, any>,
    public readonly expiryDate?: Date
  ) {}
}

export class UpdateWorkerCredentialCommand {
  constructor(
    public readonly workerId: string,
    public readonly credentialId: string,
    public readonly credentialData: Record<string, any>,
    public readonly expiryDate?: Date
  ) {}
}

export class VerifyWorkerCredentialCommand {
  constructor(
    public readonly workerId: string,
    public readonly credentialId: string,
    public readonly verificationSource: string,
    public readonly confidenceScore: number,
    public readonly auditDetails: Record<string, any>
  ) {}
}

export class RevokeWorkerCredentialCommand {
  constructor(
    public readonly workerId: string,
    public readonly credentialId: string,
    public readonly reason: string
  ) {}
}

export class GrantComplianceExemptionCommand {
  constructor(
    public readonly workerId: string,
    public readonly type: string,
    public readonly reason: string,
    public readonly grantedBy: string,
    public readonly expiresAt: Date
  ) {}
}

export class RevokeComplianceExemptionCommand {
  constructor(
    public readonly workerId: string,
    public readonly exemptionId: string,
    public readonly reason: string
  ) {}
}

export class EvaluateWorkerComplianceCommand {
  constructor(
    public readonly workerId: string
  ) {}
}

export class ArchiveWorkerComplianceCommand {
  constructor(
    public readonly workerId: string,
    public readonly reason: string
  ) {}
}
