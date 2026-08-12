import { DomainException } from '../../../exceptions/DomainException';
import { CredentialState, CredentialStateMachine } from '../state-machines/CredentialStateMachine';
import { CredentialData } from '../value-objects/CredentialData.vo';
import { ExpiryDate } from '../value-objects/ExpiryDate.vo';
import { RestrictionSet } from '../value-objects/RestrictionSet.vo';
import { VerificationAudit } from './VerificationAudit.entity';

export class WorkerCredential {
  private audits: VerificationAudit[] = [];

  constructor(
    public readonly id: string,
    public readonly workerComplianceId: string,
    public readonly type: string,
    private state: CredentialState,
    private expiryDate: ExpiryDate | null,
    private credentialData: CredentialData,
    private restrictionSet: RestrictionSet,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  public getState(): CredentialState {
    return this.state;
  }

  public getExpiryDate(): ExpiryDate | null {
    return this.expiryDate;
  }

  public getCredentialData(): CredentialData {
    return this.credentialData;
  }

  public getRestrictionSet(): RestrictionSet {
    return this.restrictionSet;
  }

  public getAudits(): ReadonlyArray<VerificationAudit> {
    return this.audits;
  }

  public addAudit(audit: VerificationAudit): void {
    this.audits.push(audit);
  }

  public verify(audit: VerificationAudit): void {
    CredentialStateMachine.transition(this.state, CredentialState.ACTIVE);
    this.state = CredentialState.ACTIVE;
    this.addAudit(audit);
  }

  public expire(): void {
    CredentialStateMachine.transition(this.state, CredentialState.EXPIRED);
    this.state = CredentialState.EXPIRED;
  }

  public suspend(reason: string): void {
    CredentialStateMachine.transition(this.state, CredentialState.SUSPENDED);
    this.state = CredentialState.SUSPENDED;
  }

  public revoke(reason: string): void {
    CredentialStateMachine.transition(this.state, CredentialState.REVOKED);
    this.state = CredentialState.REVOKED;
  }

  public updateRestrictions(newRestrictions: RestrictionSet): void {
    this.restrictionSet = newRestrictions;
  }

  public isExpired(): boolean {
    return this.expiryDate ? this.expiryDate.isExpired() : false;
  }
}
