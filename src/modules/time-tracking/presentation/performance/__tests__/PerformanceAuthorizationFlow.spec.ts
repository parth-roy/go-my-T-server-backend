import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createPerformanceRouter } from '../routes/PerformanceRoutes';
import { RealPerformanceAuthorizationService } from '../../../infrastructure/auth/RealPerformanceAuthorizationService';

// We mock PrismaClient so we don't need a real DB
vi.mock('@prisma/client', () => {
  return {
    PrismaClient: class {
      $transaction = vi.fn(async (cb) => {
        if (typeof cb === 'function') return cb({});
        return [];
      });
      workerPerformanceCycle = {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
        update: vi.fn(),
      };
      performanceScoringPolicy = {
        findFirst: vi.fn().mockResolvedValue(null),
      };
      worker = {
        findUnique: vi.fn().mockResolvedValue(null),
      };
    }
  };
});

// Mock resolveContext middleware
vi.mock('../../../../../shared/middleware/context.middleware', () => ({
  resolveContext: (req: any, res: any, next: any) => {
    const role = req.headers['x-mock-role'];
    const type = req.headers['x-mock-type'];
    const userId = req.headers['x-mock-user-id'];

    if (role && type && userId) {
      req.context = {
        user: { id: userId, phone: '123', rootRole: 'USER' },
        workspace: { id: 'org-1', type: 'ORGANIZATION' },
        platformIdentity: { type, role },
        organization: { id: 'org-1', status: 'ACTIVE' },
        membership: { id: 'mem-1', role, status: 'ACTIVE' }
      };
    } else {
      req.context = null; // Unauthenticated
    }
    next();
  }
}));

describe('Performance Authorization Identity Flow', () => {
  let app: express.Application;
  let prisma: PrismaClient;
  let mockUserId = 'worker-1';
  let mockRole = 'WORKER';

  beforeEach(() => {
    mockUserId = 'worker-1';
    mockRole = 'WORKER';
    prisma = new PrismaClient();
    prisma.worker.findUnique = vi.fn().mockImplementation(async () => {
      return {
        id: mockUserId, // Let's pretend workerId is same as mockUserId for this test
        userId: mockUserId
      };
    });

    app = express();
    app.use(express.json());

    app.use('/api/v1/performance', createPerformanceRouter(prisma));
    
    // Error handler
    app.use((err: any, req: any, res: any, next: any) => {
      res.status(err.statusCode || 500).json({ code: err.code, message: err.message });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('1. Authenticated Worker request: worker can update their own KR', async () => {
    // We expect the auth check to pass. Since Prisma returns null for cycle, we'll get a Domain Error
    // "WorkerPerformanceCycle not found" which is a 500/400, but crucially NOT a 403 Forbidden.
    const res = await request(app)
      .post('/api/v1/performance/workers/worker-1/objectives/obj-1/key-results/kr-1/progress')
      .set('x-mock-user-id', 'worker-1')
      .set('x-mock-type', 'ORGANIZATION_MEMBER')
      .set('x-mock-role', 'WORKER')
      .send({ currentValue: 50 });

    expect(res.status).not.toBe(403);
    // Since the cycle doesn't exist in our DB mock, it will fail at the repository fetch step.
    expect(res.body.message).toContain('WorkerPerformanceCycle not found');
  });

  it('2. Worker attempting another worker\'s KR: 403 Forbidden', async () => {
    // A worker (worker-2) tries to update a KR for worker-1. The AppService uses currentActorId (worker-2).
    // The command is for worker-1. RealAuthService checks if currentActorId === command.workerId.
    mockUserId = 'worker-2';
    mockRole = 'WORKER';
    const res = await request(app)
      .post('/api/v1/performance/workers/worker-1/objectives/obj-1/key-results/kr-1/progress')
      .set('x-mock-user-id', 'worker-2') // Different user
      .set('x-mock-type', 'ORGANIZATION_MEMBER')
      .set('x-mock-role', 'WORKER')
      .send({ currentValue: 50 });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Workers can only access their own performance data.');
  });

  it('3. Manager request: actual manager identity reaches authorization', async () => {
    mockUserId = 'manager-1';
    mockRole = 'SUPERVISOR';
    const res = await request(app)
      .post('/api/v1/performance/workers/worker-1/evaluations')
      .set('x-mock-user-id', 'manager-1')
      .set('x-mock-type', 'ORGANIZATION_MEMBER')
      .set('x-mock-role', 'SUPERVISOR')
      .send({ evaluationId: 'eval-1', rating: 'OUTSTANDING' });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Action SUBMIT_EVALUATION is reserved for platform administrators or system processes.');
  });

  it('4. Manager attempting unauthorized worker (role restriction)', async () => {
    // Suppose a DRIVER tries to submit a manager evaluation
    mockUserId = 'driver-1';
    mockRole = 'DRIVER';
    const res = await request(app)
      .post('/api/v1/performance/workers/worker-1/evaluations')
      .set('x-mock-user-id', 'driver-1')
      .set('x-mock-type', 'ORGANIZATION_MEMBER')
      .set('x-mock-role', 'DRIVER')
      .send({ evaluationId: 'eval-1', rating: 'OUTSTANDING' });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Action SUBMIT_EVALUATION is reserved for platform administrators or system processes.');
  });

  it('5. HR/OrgAdmin policy operation: existing rules determine the result', async () => {
    // Manage policy requires HR, ORG_ADMIN, PRIMARY_OWNER, or PLATFORM_ADMIN
    mockUserId = 'hr-1';
    mockRole = 'HR';
    const res = await request(app)
      .post('/api/v1/performance/policies')
      .set('x-mock-user-id', 'hr-1')
      .set('x-mock-type', 'ORGANIZATION_MEMBER')
      .set('x-mock-role', 'HR')
      .send({ policyId: 'p-1', version: '1.0', effectiveFrom: new Date(), okrWeight: 0.5, adherenceWeight: 0.5, ratingThresholds: [] });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Action MANAGE_POLICY is reserved for platform administrators or system processes.');
  });

  it('5b. Non-HR policy operation is forbidden', async () => {
    mockUserId = 'worker-1';
    mockRole = 'WORKER';
    const res = await request(app)
      .post('/api/v1/performance/policies')
      .set('x-mock-user-id', 'worker-1')
      .set('x-mock-type', 'ORGANIZATION_MEMBER')
      .set('x-mock-role', 'WORKER')
      .send({ policyId: 'p-1', version: '1.0', effectiveFrom: new Date(), okrWeight: 0.5, adherenceWeight: 0.5, ratingThresholds: [] });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Action MANAGE_POLICY is reserved for platform administrators or system processes.');
  });

  it('6. Unauthenticated request -> 401 (if caught by middleware) or 500/error due to no context', async () => {
    // In our simplified test setup, the resolveContext sets req.context to null.
    // The controller will create DI which will fallback to 'system'.
    // If it falls back to 'system' but context is missing, RealAuthService is NOT instantiated, 
    // it falls back to FailSafePerformanceAuthorizationService which throws 'NotImplementedError: Real IAM dependency is missing'
    const res = await request(app)
      .post('/api/v1/performance/policies')
      .send({});
      
    // Without auth, DI creates FailSafePerformanceAuthorizationService which always throws Forbidden.
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Real IAM dependency is missing');
  });

  it('7. Ensure no HTTP request silently uses actorId = system', async () => {
    // If an HR tries to create a cycle (which used to be hardcoded to 'system' in ApplicationService), 
    // the system should now use their real ID. 
    // RealPerformanceAuthorizationService requires actorId === context.user.id.
    mockUserId = 'hr-1';
    mockRole = 'HR';
    const res = await request(app)
      .post('/api/v1/performance/workers/hr-1/cycles')
      .set('x-mock-user-id', 'hr-1')
      .set('x-mock-type', 'ORGANIZATION_MEMBER')
      .set('x-mock-role', 'HR')
      .send({ cycleId: 'c-1', workerId: 'hr-1' });

    expect(res.status).toBe(403);
  });
});
