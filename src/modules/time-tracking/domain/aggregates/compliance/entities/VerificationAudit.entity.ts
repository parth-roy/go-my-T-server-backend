export class VerificationAudit {
  constructor(
    public readonly id: string,
    public readonly workerCredentialId: string,
    public readonly verificationSource: string,
    public readonly confidenceScore: number,
    public readonly auditDetails: Record<string, any>,
    public readonly verifiedAt: Date
  ) {}
}
