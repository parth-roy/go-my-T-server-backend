import { WorkerCompliance, WorkerComplianceStatus } from '../../../domain/aggregates/compliance/WorkerCompliance.aggregate';
import { WorkerCredential } from '../../../domain/aggregates/compliance/entities/WorkerCredential.entity';
import { ComplianceExemption } from '../../../domain/aggregates/compliance/entities/ComplianceExemption.entity';
import { VerificationAudit } from '../../../domain/aggregates/compliance/entities/VerificationAudit.entity';
import { CredentialData } from '../../../domain/aggregates/compliance/value-objects/CredentialData.vo';
import { ExpiryDate } from '../../../domain/aggregates/compliance/value-objects/ExpiryDate.vo';
import { RestrictionSet } from '../../../domain/aggregates/compliance/value-objects/RestrictionSet.vo';
import { PolicySnapshot } from '../../../domain/aggregates/compliance/value-objects/PolicySnapshot.vo';
import { CredentialState } from '../../../domain/aggregates/compliance/state-machines/CredentialStateMachine';
import { ComplianceEvaluationService } from '../../../domain/aggregates/compliance/services/ComplianceEvaluationService';
import {
  CreateWorkerComplianceCommand,
  AddWorkerCredentialCommand,
  UpdateWorkerCredentialCommand,
  VerifyWorkerCredentialCommand,
  RevokeWorkerCredentialCommand,
  GrantComplianceExemptionCommand,
  RevokeComplianceExemptionCommand,
  EvaluateWorkerComplianceCommand,
  ArchiveWorkerComplianceCommand
} from '../commands/ComplianceCommands';

// Mock Abstractions for Infrastructure
export interface WorkerComplianceRepository {
  findById(workerId: string): Promise<WorkerCompliance | null>;
  save(compliance: WorkerCompliance): Promise<void>;
  beginTransaction(): Promise<any>;
  commitTransaction(tx: any): Promise<void>;
  rollbackTransaction(tx: any): Promise<void>;
}

export interface EventOutboxService {
  publish(events: ReadonlyArray<any>, tx: any): Promise<void>;
}

export interface AuthorizationService {
  checkPermission(actorId: string, action: string, resourceId: string): Promise<void>;
}

export class WorkerComplianceApplicationService {
  constructor(
    private repository: WorkerComplianceRepository,
    private outbox: EventOutboxService,
    private authService: AuthorizationService,
    private evaluationService: ComplianceEvaluationService
  ) {}

  public async createWorkerCompliance(command: CreateWorkerComplianceCommand): Promise<void> {
    // 1. Authorization Hook
    await this.authService.checkPermission('system', 'CREATE_COMPLIANCE', command.organizationId);

    // 2. Validation Hook (e.g. check if worker exists via external module lookup)
    const existing = await this.repository.findById(command.workerId);
    if (existing) {
      throw new Error(`WorkerCompliance already exists for worker ${command.workerId}`);
    }

    // 3. Domain Execution
    const compliance = new WorkerCompliance(
      command.workerId,
      command.workerId,
      command.organizationId,
      WorkerComplianceStatus.PENDING_VERIFICATION, // Initial state
      PolicySnapshot.create({ initial: true }),
      1,
      new Date(),
      new Date()
    );

    // 4. Transaction Boundary
    const tx = await this.repository.beginTransaction();
    try {
      await this.repository.save(compliance);
      // 5. Outbox Publishing
      await this.outbox.publish(compliance.getDomainEvents(), tx);
      await this.repository.commitTransaction(tx);
    } catch (error) {
      await this.repository.rollbackTransaction(tx);
      throw error;
    }
  }

  public async addWorkerCredential(command: AddWorkerCredentialCommand): Promise<void> {
    const compliance = await this.getComplianceOrThrow(command.workerId);

    const credentialData = CredentialData.fromEncrypted(JSON.stringify(command.credentialData));
    const expiryDate = command.expiryDate ? ExpiryDate.create(command.expiryDate) : null;
    const restrictionSet = RestrictionSet.create([]);

    const credential = new WorkerCredential(
      crypto.randomUUID(),
      compliance.id,
      command.type,
      CredentialState.DRAFT,
      expiryDate,
      credentialData,
      restrictionSet,
      new Date(),
      new Date()
    );

    compliance.addCredential(credential);

    await this.saveAndPublish(compliance);
  }

  public async updateWorkerCredential(command: UpdateWorkerCredentialCommand): Promise<void> {
    // Left unimplemented for brevity, follow same transaction/domain/outbox pattern
  }

  public async verifyWorkerCredential(command: VerifyWorkerCredentialCommand): Promise<void> {
    const compliance = await this.getComplianceOrThrow(command.workerId);
    
    const credential = compliance.getCredentials().find((c: WorkerCredential) => c.id === command.credentialId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    const audit = new VerificationAudit(
      crypto.randomUUID(),
      credential.id,
      command.verificationSource,
      command.confidenceScore,
      command.auditDetails,
      new Date()
    );

    credential.verify(audit);
    compliance.evaluateComplianceStatus();

    await this.saveAndPublish(compliance);
  }

  public async revokeWorkerCredential(command: RevokeWorkerCredentialCommand): Promise<void> {
    const compliance = await this.getComplianceOrThrow(command.workerId);
    compliance.revokeCredential(command.credentialId, command.reason);
    await this.saveAndPublish(compliance);
  }

  public async grantComplianceExemption(command: GrantComplianceExemptionCommand): Promise<void> {
    const compliance = await this.getComplianceOrThrow(command.workerId);

    const exemption = new ComplianceExemption(
      crypto.randomUUID(),
      compliance.id,
      command.type,
      command.reason,
      command.grantedBy,
      command.expiresAt,
      new Date()
    );

    compliance.addExemption(exemption);
    await this.saveAndPublish(compliance);
  }

  public async revokeComplianceExemption(command: RevokeComplianceExemptionCommand): Promise<void> {
    // ...
  }

  public async evaluateWorkerCompliance(command: EvaluateWorkerComplianceCommand): Promise<void> {
    const compliance = await this.getComplianceOrThrow(command.workerId);
    
    // Explicitly call the domain service
    const evaluatedStatus = this.evaluationService.evaluate(compliance);
    
    // In actual implementation, we might update the aggregate if domain service says so
    compliance.evaluateComplianceStatus();

    await this.saveAndPublish(compliance);
  }

  public async archiveWorkerCompliance(command: ArchiveWorkerComplianceCommand): Promise<void> {
    // ...
  }

  private async getComplianceOrThrow(workerId: string): Promise<WorkerCompliance> {
    const compliance = await this.repository.findById(workerId);
    if (!compliance) {
      throw new Error(`WorkerCompliance not found for ${workerId}`);
    }
    return compliance;
  }

  private async saveAndPublish(compliance: WorkerCompliance): Promise<void> {
    compliance.incrementVersion();
    const tx = await this.repository.beginTransaction();
    try {
      await this.repository.save(compliance);
      const events = compliance.getDomainEvents();
      await this.outbox.publish(events, tx);
      compliance.clearDomainEvents();
      await this.repository.commitTransaction(tx);
    } catch (error) {
      await this.repository.rollbackTransaction(tx);
      throw error;
    }
  }
}
