import { describe, it, expect, beforeEach } from 'vitest';
import {
  GetWorkerPerformanceCycleQuery,
  ListWorkerPerformanceCyclesQuery,
  GetWorkerPerformanceDashboardQuery,
  GetWorkerPerformanceObjectivesQuery,
  GetPerformancePolicyQuery,
  ListPerformancePoliciesQuery,
  GetWorkerAdherenceSnapshotQuery
} from '../queries/PerformanceQueries';
import {
  GetWorkerPerformanceCycleHandler,
  ListWorkerPerformanceCyclesHandler,
  GetWorkerPerformanceDashboardHandler,
  GetWorkerPerformanceObjectivesHandler,
  GetPerformancePolicyHandler,
  ListPerformancePoliciesHandler,
  GetWorkerAdherenceSnapshotHandler
} from '../queries/handlers/PerformanceQueryHandlers';
import { PerformanceAuthorizationService } from '../interfaces/Repositories';

class MockAuthService implements PerformanceAuthorizationService {
  public failMode = false;
  async checkPermission(actorId: string, action: string, resourceId: string) {
    if (this.failMode) throw new Error('Unauthorized');
  }
}

class MockDashboardRepo {
  async getDashboard(workerId: string) { return { id: workerId, status: 'DASHBOARD_OK' }; }
  async getCycle(workerId: string, cycleId: string) { return { id: cycleId, status: 'CYCLE_OK' }; }
  async listCycles(workerId: string) { return [{ id: 'cycle-1' }]; }
  async getObjectives(workerId: string, cycleId: string) { return [{ id: 'obj-1' }]; }
}

class MockPolicyRepo {
  async getPolicy(policyId: string) { return { id: policyId, status: 'ACTIVE' }; }
  async listPolicies(status?: string) { return [{ id: 'p-1', status: status || 'ACTIVE' }]; }
}

class MockAdherenceRepo {
  async getSnapshot(workerId: string, cycleId: string) { return { score: 100 }; }
}

describe('PerformanceQueryHandlers', () => {
  let auth: MockAuthService;
  
  beforeEach(() => {
    auth = new MockAuthService();
  });

  it('GetWorkerPerformanceCycleHandler should return data', async () => {
    const handler = new GetWorkerPerformanceCycleHandler(new MockDashboardRepo(), auth);
    const result = await handler.handle(new GetWorkerPerformanceCycleQuery('w-1', 'c-1'));
    expect(result.status).toBe('CYCLE_OK');
  });

  it('GetWorkerPerformanceCycleHandler should fail if unauthorized', async () => {
    auth.failMode = true;
    const handler = new GetWorkerPerformanceCycleHandler(new MockDashboardRepo(), auth);
    await expect(handler.handle(new GetWorkerPerformanceCycleQuery('w-1', 'c-1'))).rejects.toThrow('Unauthorized');
  });

  it('ListWorkerPerformanceCyclesHandler should return list', async () => {
    const handler = new ListWorkerPerformanceCyclesHandler(new MockDashboardRepo(), auth);
    const result = await handler.handle(new ListWorkerPerformanceCyclesQuery('w-1'));
    expect(result.length).toBe(1);
  });

  it('GetWorkerPerformanceDashboardHandler should return dashboard', async () => {
    const handler = new GetWorkerPerformanceDashboardHandler(new MockDashboardRepo(), auth);
    const result = await handler.handle(new GetWorkerPerformanceDashboardQuery('w-1'));
    expect(result.status).toBe('DASHBOARD_OK');
  });

  it('GetWorkerPerformanceObjectivesHandler should return objectives', async () => {
    const handler = new GetWorkerPerformanceObjectivesHandler(new MockDashboardRepo(), auth);
    const result = await handler.handle(new GetWorkerPerformanceObjectivesQuery('w-1', 'c-1'));
    expect(result.length).toBe(1);
  });

  it('GetPerformancePolicyHandler should return policy', async () => {
    const handler = new GetPerformancePolicyHandler(new MockPolicyRepo(), auth);
    const result = await handler.handle(new GetPerformancePolicyQuery('p-1'));
    expect(result.id).toBe('p-1');
  });

  it('ListPerformancePoliciesHandler should return policies', async () => {
    const handler = new ListPerformancePoliciesHandler(new MockPolicyRepo(), auth);
    const result = await handler.handle(new ListPerformancePoliciesQuery('DRAFT'));
    expect(result[0].status).toBe('DRAFT');
  });

  it('GetWorkerAdherenceSnapshotHandler should return snapshot', async () => {
    const handler = new GetWorkerAdherenceSnapshotHandler(new MockAdherenceRepo(), auth);
    const result = await handler.handle(new GetWorkerAdherenceSnapshotQuery('w-1', 'c-1'));
    expect(result.score).toBe(100);
  });
});
