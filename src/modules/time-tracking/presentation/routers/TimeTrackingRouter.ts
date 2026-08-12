import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { RecordPunchController } from '../controllers/RecordPunchController';
import { RecordPunchCommandHandler } from '../../application/commands/RecordPunchCommandHandler';
import { PrismaTimeTrackingRepository } from '../../infrastructure/database/PrismaTimeTrackingRepository';

export function createTimeTrackingRouter(prisma: PrismaClient): Router {
  const router = Router();

  // 1. Initialize Infrastructure Adapters
  const repository = new PrismaTimeTrackingRepository(prisma);

  // 2. Initialize Application Handlers
  // Note: in a real DI framework this would be resolved automatically
  const recordPunchCommandHandler = new RecordPunchCommandHandler(
    repository, // commandInbox
    repository, // eventStore
    repository  // outbox
  );

  // 3. Initialize Presentation Controllers
  const recordPunchController = new RecordPunchController(recordPunchCommandHandler);

  // 4. Define Routes
  // POST /api/v1/time-tracking/punches
  router.post('/punches', recordPunchController.recordPunch);

  return router;
}
