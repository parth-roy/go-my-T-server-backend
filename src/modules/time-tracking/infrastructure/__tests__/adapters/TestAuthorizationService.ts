import { AuthorizationService } from '../../../application/compliance/services/WorkerComplianceApplicationService';

export class TestAuthorizationService implements AuthorizationService {
  public async checkPermission(actorId: string, action: string, resourceId: string): Promise<void> {
    // Always allow for E2E integration test boundaries where auth isn't the primary focus.
    return Promise.resolve();
  }
}
