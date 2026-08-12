import { WorkerComplianceApplicationService } from '../../../application/compliance/services/WorkerComplianceApplicationService';
import { AddWorkerCredentialCommand, VerifyWorkerCredentialCommand, RevokeWorkerCredentialCommand } from '../../../application/compliance/commands/ComplianceCommands';
import { AddWorkerCredentialDto, VerifyWorkerCredentialDto, RevokeWorkerCredentialDto } from '../dtos/ComplianceDtos';

export class WorkerCredentialController {
  constructor(private appService: WorkerComplianceApplicationService) {}

  public async addCredential(req: any, res: any): Promise<void> {
    try {
      const dto: AddWorkerCredentialDto = req.body;
      const command = new AddWorkerCredentialCommand(
        dto.workerId,
        dto.type,
        dto.credentialData,
        dto.expiryDate ? new Date(dto.expiryDate) : undefined
      );
      
      await this.appService.addWorkerCredential(command);
      
      res.status(201).json({ success: true, data: null });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  public async verifyCredential(req: any, res: any): Promise<void> {
    try {
      const dto: VerifyWorkerCredentialDto = req.body;
      const command = new VerifyWorkerCredentialCommand(
        dto.workerId,
        dto.credentialId,
        dto.verificationSource,
        dto.confidenceScore,
        dto.auditDetails
      );
      
      await this.appService.verifyWorkerCredential(command);
      
      res.status(200).json({ success: true, data: null });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  public async revokeCredential(req: any, res: any): Promise<void> {
    try {
      const dto: RevokeWorkerCredentialDto = req.body;
      const command = new RevokeWorkerCredentialCommand(dto.workerId, dto.credentialId, dto.reason);
      
      await this.appService.revokeWorkerCredential(command);
      
      res.status(200).json({ success: true, data: null });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  private handleError(error: any, res: any): void {
    res.status(400).json({
      success: false,
      message: error.message || 'Domain Error',
      code: error.code || 'VALIDATION_ERROR',
      errorId: crypto.randomUUID(),
      errorCategory: 'Validation',
      occurredAt: new Date().toISOString()
    });
  }
}
