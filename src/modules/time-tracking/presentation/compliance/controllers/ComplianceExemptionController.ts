import { WorkerComplianceApplicationService } from '../../../application/compliance/services/WorkerComplianceApplicationService';
import { GrantComplianceExemptionCommand, RevokeComplianceExemptionCommand } from '../../../application/compliance/commands/ComplianceCommands';
import { GrantComplianceExemptionDto } from '../dtos/ComplianceDtos';

export class ComplianceExemptionController {
  constructor(private appService: WorkerComplianceApplicationService) {}

  public async grantExemption(req: any, res: any): Promise<void> {
    try {
      const dto: GrantComplianceExemptionDto = req.body;
      const command = new GrantComplianceExemptionCommand(
        dto.workerId,
        dto.type,
        dto.reason,
        dto.grantedBy,
        new Date(dto.expiresAt)
      );
      
      await this.appService.grantComplianceExemption(command);
      
      res.status(201).json({ success: true, data: null });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  public async revokeExemption(req: any, res: any): Promise<void> {
    try {
      const { workerId, exemptionId, reason } = req.body;
      const command = new RevokeComplianceExemptionCommand(workerId, exemptionId, reason);
      
      await this.appService.revokeComplianceExemption(command);
      
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
