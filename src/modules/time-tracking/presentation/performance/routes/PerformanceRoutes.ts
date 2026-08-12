import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { PerformanceModuleDI } from '../../../infrastructure/PerformanceModuleDI';
import { WorkerPerformanceController } from '../controllers/WorkerPerformanceController';
import { PerformanceScoringPolicyController } from '../controllers/PerformanceScoringPolicyController';
import { resolveContext } from '../../../../../shared/middleware/context.middleware';

export function createPerformanceRouter(prisma: PrismaClient): Router {
  const router = Router();
  
  // Middleware to ensure context is populated
  router.use(resolveContext);

  const getWorkerController = (req: any) => {
    const di = new PerformanceModuleDI(prisma, req.context);
    return new WorkerPerformanceController(di);
  };

  const getPolicyController = (req: any) => {
    const di = new PerformanceModuleDI(prisma, req.context);
    return new PerformanceScoringPolicyController(di);
  };

  // --- Worker Performance Cycle ---
  router.post('/workers/:workerId/cycles', async (req: any, res: any) => getWorkerController(req).createCycle(req, res));
  router.post('/workers/:workerId/cycles/close', async (req: any, res: any) => getWorkerController(req).closeCycle(req, res));
  router.post('/workers/:workerId/cycles/reopen', async (req: any, res: any) => getWorkerController(req).reopenCycle(req, res));
  router.get('/workers/:workerId/cycles', async (req: any, res: any) => getWorkerController(req).listCycles(req, res));
  router.get('/workers/:workerId/cycles/:cycleId', async (req: any, res: any) => getWorkerController(req).getCycle(req, res));
  router.post('/workers/:workerId/cycles/score', async (req: any, res: any) => getWorkerController(req).scoreCycle(req, res));

  // --- Worker Objectives & Key Results ---
  router.post('/workers/:workerId/objectives', async (req: any, res: any) => getWorkerController(req).addObjective(req, res));
  router.post('/workers/:workerId/objectives/:objectiveId/key-results', async (req: any, res: any) => getWorkerController(req).addKeyResult(req, res));
  router.post('/workers/:workerId/objectives/:objectiveId/key-results/:keyResultId/progress', async (req: any, res: any) => getWorkerController(req).updateKeyResultProgress(req, res));
  router.get('/workers/:workerId/cycles/:cycleId/objectives', async (req: any, res: any) => getWorkerController(req).getObjectives(req, res));

  // --- Worker Evaluations & Calibrations ---
  router.post('/workers/:workerId/evaluations', async (req: any, res: any) => getWorkerController(req).submitEvaluation(req, res));
  router.post('/workers/:workerId/evaluations/calibrate', async (req: any, res: any) => getWorkerController(req).calibrate(req, res));

  // --- Dashboards & Reports ---
  router.get('/workers/:workerId/dashboard', async (req: any, res: any) => getWorkerController(req).getDashboard(req, res));
  router.get('/workers/:workerId/cycles/:cycleId/adherence', async (req: any, res: any) => getWorkerController(req).getAdherenceSnapshot(req, res));

  // --- Performance Scoring Policies ---
  router.post('/policies', async (req: any, res: any) => getPolicyController(req).createPolicy(req, res));
  router.post('/policies/:policyId/activate', async (req: any, res: any) => getPolicyController(req).activatePolicy(req, res));
  router.post('/policies/:policyId/archive', async (req: any, res: any) => getPolicyController(req).archivePolicy(req, res));
  router.get('/policies', async (req: any, res: any) => getPolicyController(req).listPolicies(req, res));
  router.get('/policies/:policyId', async (req: any, res: any) => getPolicyController(req).getPolicy(req, res));

  return router;
}
