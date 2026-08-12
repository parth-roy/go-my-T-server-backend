import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComplianceDashboardController, ComplianceAuditController } from '../controllers/ReadControllers';
import { ComplianceExemptionController } from '../controllers/ComplianceExemptionController';
import { WorkerCredentialController } from '../controllers/WorkerCredentialController';

describe('Compliance Controllers', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    req = { params: {}, body: {}, query: {} };
    res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    next = vi.fn();
  });

  describe('ComplianceDashboardController', () => {
    it('should return 200 with dashboard data', async () => {
      const dashboardHandler = { handle: vi.fn().mockResolvedValue({}) };
      const orgHandler = { handle: vi.fn().mockResolvedValue({}) };
      const controller = new ComplianceDashboardController(dashboardHandler as any, orgHandler as any);
      req.params = { organizationId: 'org-1' };
      await controller.getOrganizationDashboard(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
    });

    it('should get worker dashboard', async () => {
      const dashboardHandler = { handle: vi.fn().mockResolvedValue({}) };
      const orgHandler = { handle: vi.fn().mockResolvedValue({}) };
      const controller = new ComplianceDashboardController(dashboardHandler as any, orgHandler as any);
      req.params = { workerId: 'w-1' };
      await controller.getWorkerDashboard(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors in getWorkerDashboard', async () => {
      const dashboardHandler = { handle: vi.fn().mockRejectedValue(new Error('Test error')) };
      const orgHandler = { handle: vi.fn().mockResolvedValue({}) };
      const controller = new ComplianceDashboardController(dashboardHandler as any, orgHandler as any);
      req.params = { workerId: 'w-1' };
      await controller.getWorkerDashboard(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle errors in getOrganizationDashboard', async () => {
      const dashboardHandler = { handle: vi.fn().mockResolvedValue({}) };
      const orgHandler = { handle: vi.fn().mockRejectedValue(new Error('Test error')) };
      const controller = new ComplianceDashboardController(dashboardHandler as any, orgHandler as any);
      req.params = { organizationId: 'org-1' };
      await controller.getOrganizationDashboard(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('ComplianceAuditController', () => {
    it('should return timeline', async () => {
      const timelineHandler = { handle: vi.fn().mockResolvedValue([]) };
      const controller = new ComplianceAuditController(timelineHandler as any);
      req.params = { workerId: 'w-1' };
      req.query = { limit: '10' };
      await controller.getTimeline(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors in timeline', async () => {
      const timelineHandler = { handle: vi.fn().mockRejectedValue(new Error('error')) };
      const controller = new ComplianceAuditController(timelineHandler as any);
      req.params = { workerId: 'w-1' };
      req.query = {};
      await controller.getTimeline(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('ComplianceExemptionController', () => {
    it('should grant exemption', async () => {
      const appService = { grantComplianceExemption: vi.fn().mockResolvedValue(undefined) };
      const controller = new ComplianceExemptionController(appService as any);
      
      req.body = {
        workerId: 'w-1',
        type: 'MEDICAL',
        reason: 'Temporary note',
        grantedBy: 'admin',
        expiresAt: new Date().toISOString()
      };
      
      await controller.grantExemption(req, res);
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it('should revoke exemption', async () => {
      const appService = { revokeComplianceExemption: vi.fn().mockResolvedValue(undefined) };
      const controller = new ComplianceExemptionController(appService as any);
      req.body = { workerId: 'w-1', exemptionId: 'ex-1', reason: 'reason' };
      await controller.revokeExemption(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors in revokeExemption', async () => {
      const appService = { revokeComplianceExemption: vi.fn().mockRejectedValue(new Error('error')) };
      const controller = new ComplianceExemptionController(appService as any);
      req.body = { workerId: 'w-1', exemptionId: 'ex-1', reason: 'reason' };
      await controller.revokeExemption(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle errors in grantExemption', async () => {
      const appService = { grantComplianceExemption: vi.fn().mockRejectedValue(new Error('error')) };
      const controller = new ComplianceExemptionController(appService as any);
      req.body = { workerId: 'w-1', type: 'MEDICAL' };
      await controller.grantExemption(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('WorkerCredentialController', () => {
    it('should add credential', async () => {
      const appService = { addWorkerCredential: vi.fn().mockResolvedValue(undefined) };
      const controller = new WorkerCredentialController(appService as any);
      
      req.body = {
        workerId: 'w-1',
        type: 'DRIVERS_LICENSE',
        credentialData: { number: '123' },
        expiryDate: new Date().toISOString()
      };
      
      await controller.addCredential(req, res);
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it('should verify credential', async () => {
      const appService = { verifyWorkerCredential: vi.fn().mockResolvedValue(undefined) };
      const controller = new WorkerCredentialController(appService as any);
      req.body = { workerId: 'w-1', credentialId: 'c-1', verificationSource: 's', confidenceScore: 100, auditDetails: {} };
      await controller.verifyCredential(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should revoke credential', async () => {
      const appService = { revokeWorkerCredential: vi.fn().mockResolvedValue(undefined) };
      const controller = new WorkerCredentialController(appService as any);
      req.body = { workerId: 'w-1', credentialId: 'c-1', reason: 'r' };
      await controller.revokeCredential(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors in addCredential', async () => {
      const appService = { addWorkerCredential: vi.fn().mockRejectedValue(new Error('err')) };
      const controller = new WorkerCredentialController(appService as any);
      req.body = { workerId: 'w-1', type: 'DRIVERS_LICENSE', credentialData: {} };
      await controller.addCredential(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle errors in verifyCredential', async () => {
      const appService = { verifyWorkerCredential: vi.fn().mockRejectedValue(new Error('err')) };
      const controller = new WorkerCredentialController(appService as any);
      req.body = { workerId: 'w-1', credentialId: 'c-1' };
      await controller.verifyCredential(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle errors in revokeCredential', async () => {
      const appService = { revokeWorkerCredential: vi.fn().mockRejectedValue(new Error('err')) };
      const controller = new WorkerCredentialController(appService as any);
      req.body = { workerId: 'w-1', credentialId: 'c-1' };
      await controller.revokeCredential(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
