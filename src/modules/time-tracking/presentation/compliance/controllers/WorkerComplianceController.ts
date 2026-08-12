import { WorkerComplianceApplicationService } from '../../../application/compliance/services/WorkerComplianceApplicationService';
import { CreateWorkerComplianceCommand, EvaluateWorkerComplianceCommand } from '../../../application/compliance/commands/ComplianceCommands';
import { CreateWorkerComplianceDto, EvaluateWorkerComplianceDto } from '../dtos/ComplianceDtos';
import { GetWorkerComplianceQuery } from '../../../application/compliance/queries/ComplianceQueries';
import { GetWorkerComplianceHandler } from '../../../application/compliance/queries/handlers/ComplianceQueryHandlers';

export class WorkerComplianceController {
  constructor(
    private appService: WorkerComplianceApplicationService,
    private getQueryHandler: GetWorkerComplianceHandler
  ) {}

  public async createCompliance(req: any, res: any): Promise<void> {
    try {
      const dto: CreateWorkerComplianceDto = req.body;
      const command = new CreateWorkerComplianceCommand(dto.workerId, dto.organizationId);
      
      await this.appService.createWorkerCompliance(command);
      
      res.status(201).json({
        success: true,
        message: 'Worker compliance initialized.',
        data: null
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  public async evaluateCompliance(req: any, res: any): Promise<void> {
    try {
      const dto: EvaluateWorkerComplianceDto = { workerId: req.params.workerId };
      const command = new EvaluateWorkerComplianceCommand(dto.workerId);
      
      await this.appService.evaluateWorkerCompliance(command);
      
      res.status(200).json({
        success: true,
        message: 'Worker compliance evaluated.',
        data: null
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  public async getCompliance(req: any, res: any): Promise<void> {
    try {
      const query = new GetWorkerComplianceQuery(req.params.workerId);
      const data = await this.getQueryHandler.handle(query);
      
      res.status(200).json({
        success: true,
        data
      });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  private handleError(error: any, res: any): void {
    // Standard Enterprise Error Format from Governance v1.0
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
