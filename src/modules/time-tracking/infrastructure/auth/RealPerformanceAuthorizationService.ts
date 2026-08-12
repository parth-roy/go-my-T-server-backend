import { PrismaClient } from '@prisma/client';
import { PerformanceAuthorizationService } from '../../application/performance/interfaces/Repositories';
import { RequestContext } from '../../../../shared/context/request-context';
import { AppError } from '../../../../shared/errors/AppError';

export class RealPerformanceAuthorizationService implements PerformanceAuthorizationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly context: RequestContext
  ) {}

  async checkPermission(actorId: string, action: string, resourceId: string): Promise<void> {
    // 1. Platform Admin / System Bypass
    if (actorId === 'system' || this.context.platformIdentity?.type === 'PLATFORM_ADMIN') {
      return;
    }

    // 2. Authenticated User Check
    const actorUserId = this.context.user?.id;
    if (!actorUserId) {
      throw AppError.forbidden('No authenticated user found in context.');
    }

    // 3. Resolve actor User.id -> Worker.id
    const actorWorker = await this.prisma.worker.findUnique({
      where: { userId: actorUserId }
    });

    const actorWorkerId = actorWorker?.id;

    if (!actorWorkerId) {
      throw AppError.forbidden('Authenticated user is not a Worker and lacks administrative access.');
    }

    // 4. Action Capability Check
    switch (action) {
      // Actions strictly reserved for system/admins
      case 'MANAGE_POLICY':
      case 'CREATE_POLICY':
      case 'ARCHIVE_POLICY':
      case 'ACTIVATE_POLICY':
      case 'CREATE_CYCLE':
      case 'MANAGE_CYCLE':
      case 'SCORE_CYCLE':
      case 'SUBMIT_EVALUATION':
      case 'CALIBRATE':
        throw AppError.forbidden(`Action ${action} is reserved for platform administrators or system processes.`);

      // Actions allowed for a Worker on their own data
      case 'MANAGE_OBJECTIVE':
      case 'UPDATE_KR':
      case 'READ_CYCLE':
      case 'READ_DASHBOARD':
      case 'READ_OBJECTIVES':
      case 'READ_ADHERENCE':
        if (actorWorkerId !== resourceId) {
          throw AppError.forbidden('Workers can only access their own performance data.');
        }
        break;

      case 'READ_POLICY':
        break;

      default:
        throw AppError.forbidden(`Insufficient permissions for ${action}`);
    }
  }
}
