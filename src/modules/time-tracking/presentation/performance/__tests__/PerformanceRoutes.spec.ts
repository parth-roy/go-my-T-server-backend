import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createPerformanceRouter } from '../routes/PerformanceRoutes';

// We mock the DB or DI but for these route tests we can just rely on the AppError/Auth errors
// being thrown before DB access, or mock the Prisma client. 
// Since we want to test correct HTTP response mapping, we will mock the DI's appService & query handlers
import { PerformanceModuleDI } from '../../../infrastructure/PerformanceModuleDI';

vi.mock('../../../infrastructure/PerformanceModuleDI');

describe('PerformanceRoutes', () => {
  let app: express.Application;
  let prisma: PrismaClient;
  let mockAppService: any;
  let mockQueryHandlers: any;

  beforeEach(() => {
    prisma = new PrismaClient();
    app = express();
    app.use(express.json());

    // Mock resolveContext middleware
    vi.mock('../../../../../shared/middleware/context.middleware', () => ({
      resolveContext: (req: any, res: any, next: any) => {
        // We can simulate different users via headers for testing
        const role = req.headers['x-mock-role'];
        const type = req.headers['x-mock-type'];
        const userId = req.headers['x-mock-user-id'];

        if (role && type && userId) {
          req.context = {
            user: { id: userId, phone: '123', rootRole: 'USER' },
            workspace: { id: 'org-1', type: 'ORGANIZATION' },
            platformIdentity: { type, role },
            membership: { id: 'mem-1', role, status: 'ACTIVE' }
          };
        } else {
          // Unauthenticated
          req.context = null;
        }
        next();
      }
    }));

    mockAppService = {
      createWorkerPerformanceCycle: vi.fn(),
      closeWorkerPerformanceCycle: vi.fn(),
      reopenWorkerPerformanceCycle: vi.fn(),
      addObjective: vi.fn(),
      addKeyResult: vi.fn(),
      updateKeyResultProgress: vi.fn(),
      submitManagerEvaluation: vi.fn(),
      calibrate: vi.fn(),
      scoreWorkerPerformanceCycle: vi.fn(),
      createScoringPolicy: vi.fn(),
      activateScoringPolicy: vi.fn(),
      archivePerformanceScoringPolicy: vi.fn()
    };

    mockQueryHandlers = {
      getWorkerPerformanceCycleHandler: { handle: vi.fn() },
      listWorkerPerformanceCyclesHandler: { handle: vi.fn() },
      getWorkerPerformanceDashboardHandler: { handle: vi.fn() },
      getWorkerPerformanceObjectivesHandler: { handle: vi.fn() },
      getPerformancePolicyHandler: { handle: vi.fn() },
      listPerformancePoliciesHandler: { handle: vi.fn() },
      getWorkerAdherenceSnapshotHandler: { handle: vi.fn() }
    };

    // Override the constructor mock
    (PerformanceModuleDI as any).mockImplementation(function() {
      return {
        appService: mockAppService,
        ...mockQueryHandlers
      };
    });

    // To test authorization properly without DI real instantiation, we need to handle 
    // it in the mock, or we can use the real DI but mock the Prisma client.
    // However, the instructions say to verify HTTP response mapping. So we simulate
    // AppError throws in the mock AppService.

    app.use('/api/v1/performance', createPerformanceRouter(prisma));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('Route and Controller Mapping', () => {
    
    it('authenticated authorized request (createCycle)', async () => {
      mockAppService.createWorkerPerformanceCycle.mockResolvedValue();
      const res = await request(app)
        .post('/api/v1/performance/workers/worker-1/cycles')
        .set('x-mock-role', 'HR_ADMIN')
        .set('x-mock-type', 'ORGANIZATION_MEMBER')
        .set('x-mock-user-id', 'test-user')
        .send({ cycleId: 'cycle-1', workerId: 'worker-1' });

      if (res.status !== 201) console.log(res.body); expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mockAppService.createWorkerPerformanceCycle).toHaveBeenCalled();
    });

    it('unauthenticated request', async () => {
      // By omitting the x-mock headers, resolveContext leaves req.context = null
      // The controller will crash or throw a 500/403 if it expects context. 
      // But in this test setup with Mock DI, the DI gets a null context.
      // We simulate auth failure by rejecting.
      mockAppService.createWorkerPerformanceCycle.mockRejectedValue({
        statusCode: 401,
        message: 'Unauthenticated',
        code: 'UNAUTHENTICATED'
      });

      const res = await request(app)
        .post('/api/v1/performance/workers/worker-1/cycles')
        .send({ cycleId: 'cycle-1', workerId: 'worker-1' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Unauthenticated');
    });

    it('unauthorized role mapping', async () => {
      mockAppService.submitManagerEvaluation.mockRejectedValue({
        statusCode: 403,
        message: 'Role EMPLOYEE cannot submit evaluations',
        code: 'FORBIDDEN'
      });

      const res = await request(app)
        .post('/api/v1/performance/workers/worker-1/evaluations')
        .set('x-mock-role', 'EMPLOYEE')
        .set('x-mock-type', 'ORGANIZATION_MEMBER')
        .set('x-mock-user-id', 'test-user')
        .send({ evaluationId: 'e-1', rating: 'OUTSTANDING' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('invalid DTO / domain validation failure', async () => {
      mockAppService.createScoringPolicy.mockRejectedValue(new Error('Invalid weight distribution'));

      const res = await request(app)
        .post('/api/v1/performance/policies')
        .set('x-mock-role', 'PLATFORM_ADMIN')
        .set('x-mock-type', 'PLATFORM_ADMIN')
        .set('x-mock-user-id', 'test-user')
        .send({}); // Empty request

      // Since we don't have explicit AppError here, it defaults to 500, but in 
      // a real Domain it should be mapped properly. We check the base handler:
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Invalid weight distribution');
    });

    it('missing resource', async () => {
      mockQueryHandlers.getWorkerPerformanceCycleHandler.handle.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/performance/workers/worker-1/cycles/cycle-999')
        .set('x-mock-role', 'HR_ADMIN')
        .set('x-mock-type', 'ORGANIZATION_MEMBER')
        .set('x-mock-user-id', 'test-user');

      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
    });

    it('successful query', async () => {
      mockQueryHandlers.listWorkerPerformanceCyclesHandler.handle.mockResolvedValue([{ id: 'cycle-1' }]);

      const res = await request(app)
        .get('/api/v1/performance/workers/worker-1/cycles')
        .set('x-mock-role', 'HR_ADMIN')
        .set('x-mock-type', 'ORGANIZATION_MEMBER')
        .set('x-mock-user-id', 'test-user');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe('cycle-1');
    });

    it('addKeyResult flow', async () => {
      mockAppService.addKeyResult.mockResolvedValue();

      const res = await request(app)
        .post('/api/v1/performance/workers/worker-1/objectives/obj-1/key-results')
        .set('x-mock-role', 'HR_ADMIN')
        .set('x-mock-type', 'ORGANIZATION_MEMBER')
        .set('x-mock-user-id', 'test-user')
        .send({ keyResultId: 'kr-1', title: 'KR', targetValue: 10, unit: 'kg' });


      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Key result added.');
      expect(mockAppService.addKeyResult).toHaveBeenCalled();
    });

    it('close/reopen cycle flow', async () => {
      mockAppService.closeWorkerPerformanceCycle.mockResolvedValue();
      const resClose = await request(app)
        .post('/api/v1/performance/workers/worker-1/cycles/close')
        .set('x-mock-role', 'HR_ADMIN')
        .set('x-mock-type', 'ORGANIZATION_MEMBER')
        .set('x-mock-user-id', 'test-user')
        .send({ reason: 'close' });
      
      expect(resClose.status).toBe(200);
      expect(resClose.body.message).toBe('Performance cycle closed.');

      mockAppService.reopenWorkerPerformanceCycle.mockResolvedValue();
      const resReopen = await request(app)
        .post('/api/v1/performance/workers/worker-1/cycles/reopen')
        .set('x-mock-role', 'HR_ADMIN')
        .set('x-mock-type', 'ORGANIZATION_MEMBER')
        .set('x-mock-user-id', 'test-user')
        .send({ reason: 'reopen' });
      
      expect(resReopen.status).toBe(200);
      expect(resReopen.body.message).toBe('Performance cycle reopened.');
    });

    it('policy create/activate/archive', async () => {
      mockAppService.createScoringPolicy.mockResolvedValue();
      const resCreate = await request(app)
        .post('/api/v1/performance/policies')
        .set('x-mock-role', 'PLATFORM_ADMIN')
        .set('x-mock-type', 'PLATFORM_ADMIN')
        .set('x-mock-user-id', 'test-user')
        .send({ policyId: 'p-1', version: '1', effectiveFrom: new Date(), okrWeight: 0.5, adherenceWeight: 0.5, ratingThresholds: [] });
      expect(resCreate.status).toBe(201);

      mockAppService.activateScoringPolicy.mockResolvedValue();
      const resActivate = await request(app)
        .post('/api/v1/performance/policies/p-1/activate')
        .set('x-mock-role', 'PLATFORM_ADMIN')
        .set('x-mock-type', 'PLATFORM_ADMIN')
        .set('x-mock-user-id', 'test-user')
        .send();
      expect(resActivate.status).toBe(200);

      mockAppService.archivePerformanceScoringPolicy.mockResolvedValue();
      const resArchive = await request(app)
        .post('/api/v1/performance/policies/p-1/archive')
        .set('x-mock-role', 'PLATFORM_ADMIN')
        .set('x-mock-type', 'PLATFORM_ADMIN')
        .set('x-mock-user-id', 'test-user')
        .send({ reason: 'dep' });
      expect(resArchive.status).toBe(200);
    });

    it('calibration flow', async () => {
      mockAppService.calibrate.mockResolvedValue();
      const res = await request(app)
        .post('/api/v1/performance/workers/worker-1/evaluations/calibrate')
        .set('x-mock-role', 'HR_ADMIN')
        .set('x-mock-type', 'ORGANIZATION_MEMBER')
        .set('x-mock-user-id', 'test-user')
        .send({ newRating: 'OUTSTANDING', reason: 'adjusted' });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Calibration applied.');
    });

    it('scoring flow', async () => {
      mockAppService.scoreWorkerPerformanceCycle.mockResolvedValue();
      const res = await request(app)
        .post('/api/v1/performance/workers/worker-1/cycles/score')
        .set('x-mock-role', 'HR_ADMIN')
        .set('x-mock-type', 'ORGANIZATION_MEMBER')
        .set('x-mock-user-id', 'test-user')
        .send();
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Cycle scored.');
    });
  });
});
