import { GetWorkerComplianceDashboardHandler, GetOrganizationComplianceStatusHandler, GetComplianceTimelineHandler } from '../../../application/compliance/queries/handlers/ComplianceQueryHandlers';
import { GetWorkerComplianceDashboardQuery, GetOrganizationComplianceStatusQuery, GetComplianceTimelineQuery } from '../../../application/compliance/queries/ComplianceQueries';

export class ComplianceDashboardController {
  constructor(
    private dashboardHandler: GetWorkerComplianceDashboardHandler,
    private orgHandler: GetOrganizationComplianceStatusHandler
  ) {}

  public async getWorkerDashboard(req: any, res: any): Promise<void> {
    try {
      const query = new GetWorkerComplianceDashboardQuery(req.params.workerId);
      const data = await this.dashboardHandler.handle(query);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  public async getOrganizationDashboard(req: any, res: any): Promise<void> {
    try {
      const query = new GetOrganizationComplianceStatusQuery(req.params.organizationId);
      const data = await this.orgHandler.handle(query);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      this.handleError(error, res);
    }
  }

  private handleError(error: any, res: any): void {
    res.status(400).json({
      success: false,
      message: error.message,
      code: 'QUERY_ERROR',
      errorCategory: 'System',
      occurredAt: new Date().toISOString()
    });
  }
}

export class ComplianceAuditController {
  constructor(private timelineHandler: GetComplianceTimelineHandler) {}

  public async getTimeline(req: any, res: any): Promise<void> {
    try {
      const query = new GetComplianceTimelineQuery(req.params.workerId, req.query.limit ? parseInt(req.query.limit, 10) : 50);
      const data = await this.timelineHandler.handle(query);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}
