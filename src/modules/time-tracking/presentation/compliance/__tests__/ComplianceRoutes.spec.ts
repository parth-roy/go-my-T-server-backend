import { describe, it, expect, vi } from 'vitest';
import { ComplianceRoutes } from '../routes/ComplianceRoutes';

describe('ComplianceRoutes', () => {
  it('should initialize routes', () => {
    const router: any = {
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    };
    
    const controllers = {
      workerComplianceController: {
        createCompliance: vi.fn(),
        evaluateCompliance: vi.fn(),
        getCompliance: vi.fn()
      },
      workerCredentialController: {
        addCredential: vi.fn(),
        verifyCredential: vi.fn(),
        revokeCredential: vi.fn()
      },
      complianceExemptionController: {
        grantExemption: vi.fn(),
        revokeExemption: vi.fn()
      },
      complianceDashboardController: {
        getWorkerDashboard: vi.fn(),
        getOrganizationDashboard: vi.fn()
      },
      complianceAuditController: {
        getTimeline: vi.fn()
      }
    };

    ComplianceRoutes.configure(router, controllers);
    
    // Execute all registered routes to cover arrow functions
    for (const call of router.post.mock.calls) {
      call[1]({}, {});
    }
    for (const call of router.get.mock.calls) {
      call[1]({}, {});
    }

    expect(controllers.workerComplianceController.createCompliance).toHaveBeenCalled();
    expect(controllers.workerCredentialController.addCredential).toHaveBeenCalled();
    expect(controllers.complianceExemptionController.revokeExemption).toHaveBeenCalled();
    expect(controllers.complianceDashboardController.getWorkerDashboard).toHaveBeenCalled();
  });
});
