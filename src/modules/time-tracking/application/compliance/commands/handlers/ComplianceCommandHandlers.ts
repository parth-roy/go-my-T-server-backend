import { WorkerComplianceApplicationService } from '../../services/WorkerComplianceApplicationService';
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

export class CreateWorkerComplianceHandler {
  constructor(private service: WorkerComplianceApplicationService) {}
  async handle(command: CreateWorkerComplianceCommand): Promise<void> {
    await this.service.createWorkerCompliance(command);
  }
}

export class AddWorkerCredentialHandler {
  constructor(private service: WorkerComplianceApplicationService) {}
  async handle(command: AddWorkerCredentialCommand): Promise<void> {
    await this.service.addWorkerCredential(command);
  }
}

export class UpdateWorkerCredentialHandler {
  constructor(private service: WorkerComplianceApplicationService) {}
  async handle(command: UpdateWorkerCredentialCommand): Promise<void> {
    await this.service.updateWorkerCredential(command);
  }
}

export class VerifyWorkerCredentialHandler {
  constructor(private service: WorkerComplianceApplicationService) {}
  async handle(command: VerifyWorkerCredentialCommand): Promise<void> {
    await this.service.verifyWorkerCredential(command);
  }
}

export class RevokeWorkerCredentialHandler {
  constructor(private service: WorkerComplianceApplicationService) {}
  async handle(command: RevokeWorkerCredentialCommand): Promise<void> {
    await this.service.revokeWorkerCredential(command);
  }
}

export class GrantComplianceExemptionHandler {
  constructor(private service: WorkerComplianceApplicationService) {}
  async handle(command: GrantComplianceExemptionCommand): Promise<void> {
    await this.service.grantComplianceExemption(command);
  }
}

export class RevokeComplianceExemptionHandler {
  constructor(private service: WorkerComplianceApplicationService) {}
  async handle(command: RevokeComplianceExemptionCommand): Promise<void> {
    await this.service.revokeComplianceExemption(command);
  }
}

export class EvaluateWorkerComplianceHandler {
  constructor(private service: WorkerComplianceApplicationService) {}
  async handle(command: EvaluateWorkerComplianceCommand): Promise<void> {
    await this.service.evaluateWorkerCompliance(command);
  }
}

export class ArchiveWorkerComplianceHandler {
  constructor(private service: WorkerComplianceApplicationService) {}
  async handle(command: ArchiveWorkerComplianceCommand): Promise<void> {
    await this.service.archiveWorkerCompliance(command);
  }
}
