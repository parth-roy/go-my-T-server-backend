import { DomainException } from '../../exceptions/DomainException';
import { WorkerComplianceStatusChangedEvent, WorkerCredentialAddedEvent, WorkerCredentialRevokedEvent } from './events/WorkerComplianceEvents';
import { WorkerCredential } from './entities/WorkerCredential.entity';
import { ComplianceExemption } from './entities/ComplianceExemption.entity';
import { PolicySnapshot } from './value-objects/PolicySnapshot.vo';
import { CredentialState } from './state-machines/CredentialStateMachine';

export enum WorkerComplianceStatus {
  COMPLIANT = 'COMPLIANT',
  NON_COMPLIANT = 'NON_COMPLIANT',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION'
}

export class WorkerCompliance {
  private credentials: WorkerCredential[] = [];
  private exemptions: ComplianceExemption[] = [];
  private domainEvents: any[] = [];

  constructor(
    public readonly id: string,
    public readonly workerId: string,
    public readonly organizationId: string,
    private status: WorkerComplianceStatus,
    private policySnapshot: PolicySnapshot,
    private aggregateVersion: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {
    // Original frozen implementation: no creation event emitted on instantiation.
  }

  public getStatus(): WorkerComplianceStatus {
    return this.status;
  }

  public getPolicySnapshot(): PolicySnapshot {
    return this.policySnapshot;
  }

  public getAggregateVersion(): number {
    return this.aggregateVersion;
  }

  public getCredentials(): ReadonlyArray<WorkerCredential> {
    return this.credentials;
  }

  public getExemptions(): ReadonlyArray<ComplianceExemption> {
    return this.exemptions;
  }

  public getDomainEvents(): ReadonlyArray<any> {
    return this.domainEvents;
  }

  public clearDomainEvents(): void {
    this.domainEvents = [];
  }

  public addCredential(credential: WorkerCredential): void {
    // Check if a credential of the same type is already active
    const existing = this.credentials.find(c => c.type === credential.type && c.getState() === CredentialState.ACTIVE);
    if (existing) {
      throw new DomainException('DUPLICATE_CREDENTIAL', `An active credential of type ${credential.type} already exists.`);
    }

    this.credentials.push(credential);
    this.domainEvents.push(new WorkerCredentialAddedEvent(crypto.randomUUID(), this.id, this.organizationId, this.workerId, credential.id, credential.type));
    
    this.evaluateComplianceStatus();
  }

  public addExemption(exemption: ComplianceExemption): void {
    this.exemptions.push(exemption);
    this.evaluateComplianceStatus();
  }

  public revokeCredential(credentialId: string, reason: string): void {
    const credential = this.credentials.find(c => c.id === credentialId);
    if (!credential) {
      throw new DomainException('CREDENTIAL_NOT_FOUND', `Credential ${credentialId} not found.`);
    }
    
    credential.revoke(reason);
    this.domainEvents.push(new WorkerCredentialRevokedEvent(crypto.randomUUID(), this.id, this.organizationId, this.workerId, credentialId, reason));

    this.evaluateComplianceStatus();
  }

  public evaluateComplianceStatus(): void {
    // In a real scenario, this logic might be offloaded to a Domain Service 
    // depending on the complexity of the rules, but the aggregate orchestrates it.
    
    // For now, if any active credential is expired and there is no valid exemption, non-compliant.
    let isNonCompliant = false;
    let isPending = false;

    for (const cred of this.credentials) {
      if (cred.getState() === CredentialState.VERIFYING) {
        isPending = true;
      }
      if (cred.getState() === CredentialState.EXPIRED || cred.getState() === CredentialState.REVOKED) {
        // Check exemptions
        const hasExemption = this.exemptions.some(e => !e.isExpired());
        if (!hasExemption) {
          isNonCompliant = true;
        }
      }
    }

    const oldStatus = this.status;
    let newStatus = WorkerComplianceStatus.COMPLIANT;

    if (isNonCompliant) {
      newStatus = WorkerComplianceStatus.NON_COMPLIANT;
    } else if (isPending) {
      newStatus = WorkerComplianceStatus.PENDING_VERIFICATION;
    }

    if (oldStatus !== newStatus) {
      this.status = newStatus;
      this.domainEvents.push(new WorkerComplianceStatusChangedEvent(crypto.randomUUID(), this.id, this.organizationId, this.workerId, oldStatus, newStatus, 'Status recalculated'));
    }
  }

  public incrementVersion(): void {
    this.aggregateVersion++;
  }
}
