import { PrismaClient } from '@prisma/client';
import { WorkerComplianceRepository } from '../../../application/compliance/services/WorkerComplianceApplicationService';
import { WorkerCompliance, WorkerComplianceStatus } from '../../../domain/aggregates/compliance/WorkerCompliance.aggregate';
import { PolicySnapshot } from '../../../domain/aggregates/compliance/value-objects/PolicySnapshot.vo';
import { WorkerCredential } from '../../../domain/aggregates/compliance/entities/WorkerCredential.entity';
import { CredentialData } from '../../../domain/aggregates/compliance/value-objects/CredentialData.vo';
import { ExpiryDate } from '../../../domain/aggregates/compliance/value-objects/ExpiryDate.vo';
import { RestrictionSet } from '../../../domain/aggregates/compliance/value-objects/RestrictionSet.vo';
import { TestUnitOfWork } from './TestUnitOfWork';

export class TestPrismaWorkerComplianceRepository implements WorkerComplianceRepository {
  private currentTx: TestUnitOfWork | null = null;

  constructor(private prisma: PrismaClient) {}

  public async findById(workerId: string): Promise<WorkerCompliance | null> {
    const record = await this.prisma.workerCompliance.findUnique({
      where: { id: workerId },
      include: { credentials: true }
    });

    if (!record) return null;

    const compliance = new WorkerCompliance(
      record.id,
      record.id,
      record.organizationId,
      record.status as WorkerComplianceStatus,
      PolicySnapshot.create((record.policySnapshot as any) || {}),
      record.aggregateVersion,
      record.createdAt,
      record.updatedAt
    );
    
    // Clear any events generated during reconstitution
    compliance.clearDomainEvents();
    
    // Inject credentials directly using the internal array to bypass DomainException on past dates during load
    const internalCredentials = compliance['credentials'] as any[];
    for (const cred of record.credentials) {
      const credential = new WorkerCredential(
        cred.id,
        cred.workerComplianceId,
        cred.type,
        cred.status as any,
        cred.expiryDate ? ExpiryDate.create(cred.expiryDate, true) : null,
        CredentialData.fromEncrypted((cred.credentialData as string) || ''),
        RestrictionSet.create([]),
        cred.createdAt,
        cred.updatedAt
      );
      internalCredentials.push(credential);
    }

    return compliance;
  }

  public async save(compliance: WorkerCompliance): Promise<void> {
    const aggregateOp = this.prisma.workerCompliance.upsert({
      where: { id: compliance.id },
      update: {
        status: compliance.getStatus(),
        policySnapshot: compliance.getPolicySnapshot().snapshotData,
        aggregateVersion: compliance.getAggregateVersion(),
        updatedAt: new Date()
      },
      create: {
        id: compliance.id,
        organizationId: compliance.organizationId,
        status: compliance.getStatus(),
        policySnapshot: compliance.getPolicySnapshot().snapshotData,
        aggregateVersion: compliance.getAggregateVersion(),
      }
    });

    const credentialOps = compliance.getCredentials().map(cred => 
      this.prisma.workerCredential.upsert({
        where: { id: cred.id },
        update: {
          status: cred.getState(),
          type: cred.type,
          credentialData: cred.getCredentialData().encryptedPayload,
          expiryDate: cred.getExpiryDate()?.value || null,
          updatedAt: new Date()
        },
        create: {
          id: cred.id,
          workerComplianceId: compliance.id,
          type: cred.type,
          status: cred.getState(),
          credentialData: cred.getCredentialData().encryptedPayload,
          expiryDate: cred.getExpiryDate()?.value || null
        }
      })
    );

    if (this.currentTx) {
      this.currentTx.add(aggregateOp);
      credentialOps.forEach(op => this.currentTx!.add(op));
    } else {
      await this.prisma.$transaction([aggregateOp, ...credentialOps]);
    }
  }

  public async beginTransaction(): Promise<any> {
    this.currentTx = new TestUnitOfWork(this.prisma);
    return this.currentTx;
  }

  public async commitTransaction(tx: any): Promise<void> {
    if (tx instanceof TestUnitOfWork && tx === this.currentTx) {
      await tx.commit();
      this.currentTx = null;
    }
  }

  public async rollbackTransaction(tx: any): Promise<void> {
    if (tx instanceof TestUnitOfWork && tx === this.currentTx) {
      // Discard the queue
      this.currentTx = null;
    }
  }
}
