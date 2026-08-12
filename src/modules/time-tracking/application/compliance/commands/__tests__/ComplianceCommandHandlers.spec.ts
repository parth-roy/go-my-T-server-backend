import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkerComplianceApplicationService } from '../../services/WorkerComplianceApplicationService';
import {
  CreateWorkerComplianceHandler,
  AddWorkerCredentialHandler,
  UpdateWorkerCredentialHandler,
  VerifyWorkerCredentialHandler,
  RevokeWorkerCredentialHandler,
  GrantComplianceExemptionHandler,
  RevokeComplianceExemptionHandler,
  EvaluateWorkerComplianceHandler,
  ArchiveWorkerComplianceHandler
} from '../handlers/ComplianceCommandHandlers';
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
} from '../ComplianceCommands';

describe('ComplianceCommandHandlers', () => {
  let service: any;

  beforeEach(() => {
    service = {
      createWorkerCompliance: vi.fn(),
      addWorkerCredential: vi.fn(),
      updateWorkerCredential: vi.fn(),
      verifyWorkerCredential: vi.fn(),
      revokeWorkerCredential: vi.fn(),
      grantComplianceExemption: vi.fn(),
      revokeComplianceExemption: vi.fn(),
      evaluateWorkerCompliance: vi.fn(),
      archiveWorkerCompliance: vi.fn()
    };
  });

  it('should handle CreateWorkerComplianceCommand', async () => {
    const handler = new CreateWorkerComplianceHandler(service as any);
    const cmd = new CreateWorkerComplianceCommand('w-1', 'org-1');
    await handler.handle(cmd);
    expect(service.createWorkerCompliance).toHaveBeenCalledWith(cmd);
  });

  it('should handle AddWorkerCredentialCommand', async () => {
    const handler = new AddWorkerCredentialHandler(service as any);
    const cmd = new AddWorkerCredentialCommand('w-1', 'MEDICAL', {});
    await handler.handle(cmd);
    expect(service.addWorkerCredential).toHaveBeenCalledWith(cmd);
  });

  it('should handle UpdateWorkerCredentialCommand', async () => {
    const handler = new UpdateWorkerCredentialHandler(service as any);
    const cmd = new UpdateWorkerCredentialCommand('w-1', 'c-1', {});
    await handler.handle(cmd);
    expect(service.updateWorkerCredential).toHaveBeenCalledWith(cmd);
  });

  it('should handle VerifyWorkerCredentialCommand', async () => {
    const handler = new VerifyWorkerCredentialHandler(service as any);
    const cmd = new VerifyWorkerCredentialCommand('w-1', 'c-1', 'SYS', 95, {});
    await handler.handle(cmd);
    expect(service.verifyWorkerCredential).toHaveBeenCalledWith(cmd);
  });

  it('should handle RevokeWorkerCredentialCommand', async () => {
    const handler = new RevokeWorkerCredentialHandler(service as any);
    const cmd = new RevokeWorkerCredentialCommand('w-1', 'c-1', 'Expired');
    await handler.handle(cmd);
    expect(service.revokeWorkerCredential).toHaveBeenCalledWith(cmd);
  });

  it('should handle GrantComplianceExemptionCommand', async () => {
    const handler = new GrantComplianceExemptionHandler(service as any);
    const cmd = new GrantComplianceExemptionCommand('w-1', 'MEDICAL', 'NOTE', 'SYS', new Date());
    await handler.handle(cmd);
    expect(service.grantComplianceExemption).toHaveBeenCalledWith(cmd);
  });

  it('should handle RevokeComplianceExemptionCommand', async () => {
    const handler = new RevokeComplianceExemptionHandler(service as any);
    const cmd = new RevokeComplianceExemptionCommand('w-1', 'ex-1', 'No longer valid');
    await handler.handle(cmd);
    expect(service.revokeComplianceExemption).toHaveBeenCalledWith(cmd);
  });

  it('should handle EvaluateWorkerComplianceCommand', async () => {
    const handler = new EvaluateWorkerComplianceHandler(service as any);
    const cmd = new EvaluateWorkerComplianceCommand('w-1');
    await handler.handle(cmd);
    expect(service.evaluateWorkerCompliance).toHaveBeenCalledWith(cmd);
  });

  it('should handle ArchiveWorkerComplianceCommand', async () => {
    const handler = new ArchiveWorkerComplianceHandler(service as any);
    const cmd = new ArchiveWorkerComplianceCommand('w-1', 'Offboarded');
    await handler.handle(cmd);
    expect(service.archiveWorkerCompliance).toHaveBeenCalledWith(cmd);
  });
});
