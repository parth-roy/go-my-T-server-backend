export class ComplianceRoutes {
  public static configure(router: any, controllers: any): void {
    const { 
      workerComplianceController, 
      workerCredentialController,
      complianceExemptionController,
      complianceDashboardController,
      complianceAuditController
    } = controllers;

    // Command Routes (Write)
    router.post('/api/v1/time-tracking/compliance', 
      (req: any, res: any) => workerComplianceController.createCompliance(req, res));
      
    router.post('/api/v1/time-tracking/compliance/:workerId/evaluate', 
      (req: any, res: any) => workerComplianceController.evaluateCompliance(req, res));
      
    router.post('/api/v1/time-tracking/compliance/credentials', 
      (req: any, res: any) => workerCredentialController.addCredential(req, res));
      
    router.post('/api/v1/time-tracking/compliance/credentials/verify', 
      (req: any, res: any) => workerCredentialController.verifyCredential(req, res));
      
    router.post('/api/v1/time-tracking/compliance/credentials/revoke', 
      (req: any, res: any) => workerCredentialController.revokeCredential(req, res));
      
    router.post('/api/v1/time-tracking/compliance/exemptions', 
      (req: any, res: any) => complianceExemptionController.grantExemption(req, res));

    router.post('/api/v1/time-tracking/compliance/exemptions/revoke', 
      (req: any, res: any) => complianceExemptionController.revokeExemption(req, res));

    // Query Routes (Read)
    router.get('/api/v1/time-tracking/compliance/:workerId', 
      (req: any, res: any) => workerComplianceController.getCompliance(req, res));
      
    router.get('/api/v1/time-tracking/compliance/dashboard/:workerId', 
      (req: any, res: any) => complianceDashboardController.getWorkerDashboard(req, res));
      
    router.get('/api/v1/time-tracking/compliance/dashboard/org/:organizationId', 
      (req: any, res: any) => complianceDashboardController.getOrganizationDashboard(req, res));
      
    router.get('/api/v1/time-tracking/compliance/audit/:workerId', 
      (req: any, res: any) => complianceAuditController.getTimeline(req, res));
  }
}
