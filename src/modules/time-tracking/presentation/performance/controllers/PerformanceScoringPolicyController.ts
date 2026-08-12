import { PerformanceModuleDI } from '../../../infrastructure/PerformanceModuleDI';
import {
  CreatePerformanceScoringPolicyCommand,
  ActivatePerformanceScoringPolicyCommand,
  ArchivePerformanceScoringPolicyCommand
} from '../../../application/performance/commands/PerformanceCommands';
import {
  GetPerformancePolicyQuery,
  ListPerformancePoliciesQuery
} from '../../../application/performance/queries/PerformanceQueries';

export class PerformanceScoringPolicyController {
  constructor(private readonly di: PerformanceModuleDI) {}

  private handleError(error: any, res: any): void {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'An unexpected error occurred.',
      code: error.code || 'INTERNAL_ERROR'
    });
  }

  // --- COMMANDS ---

  public async createPolicy(req: any, res: any): Promise<void> {
    try {
      const { policyId, version, effectiveFrom, okrWeight, adherenceWeight, ratingThresholds } = req.body;
      const command = new CreatePerformanceScoringPolicyCommand(
        policyId, version, new Date(effectiveFrom), okrWeight, adherenceWeight, ratingThresholds
      );
      await this.di.appService.createScoringPolicy(command);
      res.status(201).json({ success: true, message: 'Policy created.', data: null });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  public async activatePolicy(req: any, res: any): Promise<void> {
    try {
      const policyId = req.params.policyId;
      const command = new ActivatePerformanceScoringPolicyCommand(policyId);
      await this.di.appService.activateScoringPolicy(command);
      res.status(200).json({ success: true, message: 'Policy activated.', data: null });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  public async archivePolicy(req: any, res: any): Promise<void> {
    try {
      const { reason } = req.body;
      const policyId = req.params.policyId;
      const command = new ArchivePerformanceScoringPolicyCommand(policyId, reason);
      await this.di.appService.archivePerformanceScoringPolicy(command);
      res.status(200).json({ success: true, message: 'Policy archived.', data: null });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  // --- QUERIES ---

  public async getPolicy(req: any, res: any): Promise<void> {
    try {
      const policyId = req.params.policyId;
      const query = new GetPerformancePolicyQuery(policyId);
      const data = await this.di.getPerformancePolicyHandler.handle(query);
      res.status(200).json({ success: true, data });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  public async listPolicies(req: any, res: any): Promise<void> {
    try {
      const status = req.query.status as string | undefined;
      const query = new ListPerformancePoliciesQuery(status);
      const data = await this.di.listPerformancePoliciesHandler.handle(query);
      res.status(200).json({ success: true, data });
    } catch (error) {
      this.handleError(error, res);
    }
  }
}
