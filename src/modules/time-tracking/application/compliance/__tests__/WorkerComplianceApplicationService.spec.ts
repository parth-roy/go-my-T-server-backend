import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkerComplianceApplicationService, WorkerComplianceRepository, EventOutboxService, AuthorizationService } from '../services/WorkerComplianceApplicationService';
import { ComplianceEvaluationService } from '../../../domain/aggregates/compliance/services/ComplianceEvaluationService';
import { CreateWorkerComplianceCommand, AddWorkerCredentialCommand, VerifyWorkerCredentialCommand } from '../commands/ComplianceCommands';
import { WorkerCompliance, WorkerComplianceStatus } from '../../../domain/aggregates/compliance/WorkerCompliance.aggregate';
import { WorkerCredential } from '../../../domain/aggregates/compliance/entities/WorkerCredential.entity';
import { CredentialState } from '../../../domain/aggregates/compliance/state-machines/CredentialStateMachine';
import { PolicySnapshot } from '../../../domain/aggregates/compliance/value-objects/PolicySnapshot.vo';
import { CredentialData } from '../../../domain/aggregates/compliance/value-objects/CredentialData.vo';
import { ExpiryDate } from '../../../domain/aggregates/compliance/value-objects/ExpiryDate.vo';
import { RestrictionSet } from '../../../domain/aggregates/compliance/value-objects/RestrictionSet.vo';

describe('WorkerComplianceApplicationService', () => {
  let repository: any;
  let outbox: any;
  let authService: any;
  let evaluationService: any;
  let service: WorkerComplianceApplicationService;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      save: vi.fn(),
      beginTransaction: vi.fn().mockResolvedValue('tx-1'),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn()
    };

    outbox = {
      publish: vi.fn()
    };

    authService = {
      checkPermission: vi.fn()
    };

    evaluationService = {
      evaluate: vi.fn()
    };

    service = new WorkerComplianceApplicationService(repository, outbox, authService, evaluationService);
  });

  it('should create worker compliance and publish events', async () => {
    const cmd = new CreateWorkerComplianceCommand('w-1', 'org-1');
    repository.findById.mockResolvedValue(null);

    await service.createWorkerCompliance(cmd);

    expect(authService.checkPermission).toHaveBeenCalledWith('system', 'CREATE_COMPLIANCE', 'org-1');
    expect(repository.beginTransaction).toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalled();
    expect(outbox.publish).toHaveBeenCalled();
    expect(repository.commitTransaction).toHaveBeenCalledWith('tx-1');
  });

  it('should throw error if compliance already exists in create', async () => {
    const cmd = new CreateWorkerComplianceCommand('w-1', 'org-1');
    repository.findById.mockResolvedValue({ id: 'w-1' });
    await expect(service.createWorkerCompliance(cmd)).rejects.toThrow('WorkerCompliance already exists for worker w-1');
  });

  it('should rollback transaction if save fails', async () => {
    const cmd = new CreateWorkerComplianceCommand('w-1', 'org-1');
    repository.findById.mockResolvedValue(null);
    repository.save.mockRejectedValue(new Error('DB Error'));

    await expect(service.createWorkerCompliance(cmd)).rejects.toThrow('DB Error');

    expect(repository.rollbackTransaction).toHaveBeenCalledWith('tx-1');
    expect(outbox.publish).not.toHaveBeenCalled();
    expect(repository.commitTransaction).not.toHaveBeenCalled();
  });

  it('should add credential and publish events', async () => {
    const compliance = new WorkerCompliance('w-1', 'w-1', 'org-1', WorkerComplianceStatus.PENDING_VERIFICATION, PolicySnapshot.create({}), 1, new Date(), new Date());
    repository.findById.mockResolvedValue(compliance);

    const cmd = new AddWorkerCredentialCommand('w-1', 'DRIVERS_LICENSE', { test: true }, new Date(Date.now() + 86400000));
    await service.addWorkerCredential(cmd);

    expect(repository.save).toHaveBeenCalled();
    expect(outbox.publish).toHaveBeenCalled();
    expect(compliance.getCredentials().length).toBe(1);
    expect(compliance.getCredentials()[0].type).toBe('DRIVERS_LICENSE');
  });

  it('should throw error if adding duplicate active credential', async () => {
    const compliance = new WorkerCompliance('w-1', 'w-1', 'org-1', WorkerComplianceStatus.PENDING_VERIFICATION, PolicySnapshot.create({}), 1, new Date(), new Date());
    const existingCred = new WorkerCredential('c-1', 'w-1', 'DRIVERS_LICENSE', CredentialState.ACTIVE, ExpiryDate.create(new Date(Date.now() + 100000)), CredentialData.fromEncrypted('data'), RestrictionSet.create([]), new Date(), new Date());
    compliance.addCredential(existingCred);
    compliance.clearDomainEvents(); // Clear initial events
    
    repository.findById.mockResolvedValue(compliance);

    const cmd = new AddWorkerCredentialCommand('w-1', 'DRIVERS_LICENSE', { test: true }, new Date(Date.now() + 86400000));
    await expect(service.addWorkerCredential(cmd)).rejects.toThrow('An active credential of type DRIVERS_LICENSE already exists.');
    
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.rollbackTransaction).not.toHaveBeenCalled(); // The error happens before tx starts
  });

  it('should verify credential and publish events', async () => {
    const compliance = new WorkerCompliance('w-1', 'w-1', 'org-1', WorkerComplianceStatus.PENDING_VERIFICATION, PolicySnapshot.create({}), 1, new Date(), new Date());
    const cred = new WorkerCredential('c-1', 'w-1', 'DRIVERS_LICENSE', CredentialState.VERIFYING, ExpiryDate.create(new Date(Date.now() + 100000)), CredentialData.fromEncrypted('data'), RestrictionSet.create([]), new Date(), new Date());
    compliance.addCredential(cred);
    repository.findById.mockResolvedValue(compliance);

    const cmd = new VerifyWorkerCredentialCommand('w-1', 'c-1', 'SYSTEM', 100, {});
    await service.verifyWorkerCredential(cmd);

    expect(repository.save).toHaveBeenCalled();
    expect(outbox.publish).toHaveBeenCalled();
  });

  it('should throw error when verifying non-existent compliance', async () => {
    repository.findById.mockResolvedValue(null);
    const cmd = new VerifyWorkerCredentialCommand('w-1', 'c-1', 'SYSTEM', 100, {});
    await expect(service.verifyWorkerCredential(cmd)).rejects.toThrow('WorkerCompliance not found for w-1');
  });

  it('should throw error when verifying non-existent credential', async () => {
    const compliance = new WorkerCompliance('w-1', 'w-1', 'org-1', WorkerComplianceStatus.PENDING_VERIFICATION, PolicySnapshot.create({}), 1, new Date(), new Date());
    repository.findById.mockResolvedValue(compliance);
    const cmd = new VerifyWorkerCredentialCommand('w-1', 'c-999', 'SYSTEM', 100, {});
    await expect(service.verifyWorkerCredential(cmd)).rejects.toThrow('Credential not found');
  });

  it('should rollback transaction if saveAndPublish fails', async () => {
    const compliance = new WorkerCompliance('w-1', 'w-1', 'org-1', WorkerComplianceStatus.PENDING_VERIFICATION, PolicySnapshot.create({}), 1, new Date(), new Date());
    const cred = new WorkerCredential('c-1', 'w-1', 'DRIVERS_LICENSE', CredentialState.ACTIVE, ExpiryDate.create(new Date(Date.now() + 100000)), CredentialData.fromEncrypted('data'), RestrictionSet.create([]), new Date(), new Date());
    compliance.addCredential(cred);
    repository.findById.mockResolvedValue(compliance);
    
    repository.save.mockRejectedValue(new Error('DB error in saveAndPublish'));
    
    const cmd = { workerId: 'w-1', credentialId: 'c-1', reason: 'Lost' } as any;
    await expect(service.revokeWorkerCredential(cmd)).rejects.toThrow('DB error in saveAndPublish');
    
    expect(repository.rollbackTransaction).toHaveBeenCalled();
  });

  it('should revoke credential and publish events', async () => {
    const compliance = new WorkerCompliance('w-1', 'w-1', 'org-1', WorkerComplianceStatus.PENDING_VERIFICATION, PolicySnapshot.create({}), 1, new Date(), new Date());
    const cred = new WorkerCredential('c-1', 'w-1', 'DRIVERS_LICENSE', CredentialState.ACTIVE, ExpiryDate.create(new Date(Date.now() + 100000)), CredentialData.fromEncrypted('data'), RestrictionSet.create([]), new Date(), new Date());
    compliance.addCredential(cred);
    repository.findById.mockResolvedValue(compliance);

    const cmd = { workerId: 'w-1', credentialId: 'c-1', reason: 'Lost' } as any;
    await service.revokeWorkerCredential(cmd);

    expect(repository.save).toHaveBeenCalled();
    expect(outbox.publish).toHaveBeenCalled();
  });

  it('should evaluate worker compliance and publish events', async () => {
    const compliance = new WorkerCompliance('w-1', 'w-1', 'org-1', WorkerComplianceStatus.PENDING_VERIFICATION, PolicySnapshot.create({}), 1, new Date(), new Date());
    repository.findById.mockResolvedValue(compliance);
    
    // Evaluate logic mock
    evaluationService.evaluate.mockResolvedValue({ status: WorkerComplianceStatus.COMPLIANT, metrics: {} });
    
    const cmd = { workerId: 'w-1' } as any;
    await service.evaluateWorkerCompliance(cmd);

    expect(evaluationService.evaluate).toHaveBeenCalledWith(compliance);
    expect(repository.save).toHaveBeenCalled();
    expect(outbox.publish).toHaveBeenCalled();
  });

  it('should grant and revoke compliance exemption', async () => {
    const compliance = new WorkerCompliance('w-1', 'w-1', 'org-1', WorkerComplianceStatus.PENDING_VERIFICATION, PolicySnapshot.create({}), 1, new Date(), new Date());
    repository.findById.mockResolvedValue(compliance);

    const grantCmd = { workerId: 'w-1', type: 'MEDICAL', reason: 'Test', grantedBy: 'Admin', expiresAt: new Date(Date.now() + 86400000) } as any;
    await service.grantComplianceExemption(grantCmd);
    
    expect(repository.save).toHaveBeenCalled();
    expect(outbox.publish).toHaveBeenCalled();
    
    const exemptions = compliance.getExemptions();
    expect(exemptions.length).toBe(1);
    const exemptionId = exemptions[0].id;
    
    const revokeCmd = { workerId: 'w-1', exemptionId, reason: 'Revoke Test' } as any;
    await service.revokeComplianceExemption(revokeCmd);
    
    expect(repository.save).toHaveBeenCalledTimes(1);
  });
});
