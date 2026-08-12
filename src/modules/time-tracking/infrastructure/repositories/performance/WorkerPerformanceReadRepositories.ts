import { PrismaClient } from '@prisma/client';
import { 
  WorkerPerformanceDashboardReadRepository, 
  PerformancePolicyReadRepository, 
  WorkerAdherenceReadRepository 
} from '../../../application/performance/queries/handlers/PerformanceQueryHandlers';

export class WorkerPerformanceDashboardReadRepositoryImpl implements WorkerPerformanceDashboardReadRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getDashboard(workerId: string): Promise<any> {
    return this.prisma.workerPerformanceDashboard.findFirst({
      where: { workerId },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async getCycle(workerId: string, cycleId: string): Promise<any> {
    return this.prisma.workerPerformanceDashboard.findUnique({
      where: {
        workerId_cycleId: { workerId, cycleId }
      }
    });
  }

  async listCycles(workerId: string): Promise<any[]> {
    return this.prisma.workerPerformanceDashboard.findMany({
      where: { workerId },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async getObjectives(workerId: string, cycleId: string): Promise<any[]> {
    const dashboard = await this.getCycle(workerId, cycleId);
    if (!dashboard || !dashboard.objectivesProgress) {
      return [];
    }
    return dashboard.objectivesProgress as any[];
  }
}

export class PerformancePolicyReadRepositoryImpl implements PerformancePolicyReadRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getPolicy(policyId: string): Promise<any> {
    return this.prisma.performanceScoringPolicy.findUnique({
      where: { id: policyId }
    });
  }

  async listPolicies(status?: string): Promise<any[]> {
    const whereClause = status ? { status } : {};
    return this.prisma.performanceScoringPolicy.findMany({
      where: whereClause,
      orderBy: { version: 'desc' }
    });
  }
}

export class WorkerAdherenceReadRepositoryImpl implements WorkerAdherenceReadRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getSnapshot(workerId: string, cycleId: string): Promise<any> {
    // Retrieves from the active dashboard projection to return the snapshot that was locked at the time of scoring
    const dashboard = await this.prisma.workerPerformanceDashboard.findUnique({
      where: { workerId_cycleId: { workerId, cycleId } }
    });
    return dashboard?.latestAdherenceSnapshot || null;
  }

  async getLatestAdherenceForWorker(workerId: string): Promise<any | null> {
    return this.prisma.workerAdherenceReadModel.findFirst({
      where: { workerId },
      orderBy: { aggregateVersion: 'desc' }
    });
  }
}
