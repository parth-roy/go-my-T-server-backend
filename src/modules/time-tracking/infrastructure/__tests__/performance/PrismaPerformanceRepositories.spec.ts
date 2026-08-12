import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { PrismaWorkerPerformanceCycleRepository, PrismaPerformanceEventOutboxService, TransactionManager } from '../../repositories/performance/PrismaPerformanceRepositories';
import { WorkerPerformanceCycle } from '../../../domain/aggregates/performance/WorkerPerformanceCycle.aggregate';
import { PerformanceModuleDI } from '../../PerformanceModuleDI';
import { WorkerPerformanceCycleStartedEvent } from '../../../domain/aggregates/performance/events/WorkerPerformanceEvents';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

describe('PrismaPerformanceRepositories & Infrastructure (Phase 5 - Physical DB)', () => {
  let prisma: PrismaClient;
  let cycleRepo: PrismaWorkerPerformanceCycleRepository;
  let outboxService: PrismaPerformanceEventOutboxService;
  let di: PerformanceModuleDI;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up relevant tables
    await prisma.keyResult.deleteMany();
    await prisma.workerObjective.deleteMany();
    await prisma.managerEvaluation.deleteMany();
    await prisma.workerPerformanceCycle.deleteMany();
    await prisma.performanceEvent.deleteMany();
    await prisma.timeTrackingOutbox.deleteMany();
    
    cycleRepo = new PrismaWorkerPerformanceCycleRepository(prisma);
    outboxService = new PrismaPerformanceEventOutboxService(prisma);
    di = new PerformanceModuleDI(prisma);
  });

  describe('Repository Persistence & OCC Behavior', () => {
    it('should hydrate, execute atomic OCC success and commit transaction correctly', async () => {
      const cycleId = uuidv4();
      const workerId = uuidv4();
      
      const cycle = new WorkerPerformanceCycle(cycleId, workerId, 'cy1', 'DRAFT', 1);
      
      // Save version 1
      const tx1 = await cycleRepo.beginTransaction();
      await cycleRepo.save(cycle, tx1);
      await cycleRepo.commitTransaction(tx1);

      // Verify persistence
      const saved1 = await prisma.workerPerformanceCycle.findUnique({ where: { id: cycleId } });
      expect(saved1?.aggregateVersion).toBe(1);

      // Increment version and save again
      cycle.status = 'ACTIVE';
      cycle.aggregateVersion = 2;
      expect(cycle.aggregateVersion).toBe(2);

      const tx2 = await cycleRepo.beginTransaction();
      await cycleRepo.save(cycle, tx2);
      await cycleRepo.commitTransaction(tx2);

      const saved2 = await prisma.workerPerformanceCycle.findUnique({ where: { id: cycleId } });
      expect(saved2?.aggregateVersion).toBe(2);
      expect(saved2?.status).toBe('ACTIVE');
    }, 20000);

    it('should throw ConcurrencyException when concurrent conflict occurs and prevent last-write-wins', async () => {
      const cycleId = uuidv4();
      const workerId = uuidv4();
      
      const cycle = new WorkerPerformanceCycle(cycleId, workerId, 'cy1', 'DRAFT', 1);
      
      // Save version 1
      const tx1 = await cycleRepo.beginTransaction();
      await cycleRepo.save(cycle, tx1);
      await cycleRepo.commitTransaction(tx1);

      // Simulate a concurrent stale update (trying to write version 2 when DB already has version 2)
      // First legitimately bump it to 2
      await prisma.workerPerformanceCycle.update({
        where: { id: cycleId },
        data: { aggregateVersion: 2 }
      });

      // Now `cycle` is still at version 1.
      cycle.status = 'ACTIVE';
      cycle.aggregateVersion = 2; // bumps memory version to 2
      expect(cycle.aggregateVersion).toBe(2);

      const tx2 = await cycleRepo.beginTransaction();
      await cycleRepo.save(cycle, tx2);

      // The commit should fail because we are expecting DB version to be 1, but it's 2
      await expect(cycleRepo.commitTransaction(tx2)).rejects.toThrow(/ConcurrencyException/);
    });
  });

  describe('Event-Store & Outbox Persistence', () => {
    it('should physically reject duplicate event versions (aggregateId, aggregateVersion) due to unique constraint', async () => {
      const aggregateId = uuidv4();
      
      const event1 = new WorkerPerformanceCycleStartedEvent(
        uuidv4(), aggregateId, 1, new Date(), { workerId: 'w1', cycleId: 'cy1' }, {}
      );
      
      const tx1 = new TransactionManager();
      await outboxService.publish([event1], tx1);
      await cycleRepo.commitTransaction(tx1); // commit

      // Attempt to save another event with same aggregateId and version 1
      const event2 = new WorkerPerformanceCycleStartedEvent(
        uuidv4(), aggregateId, 1, new Date(), { workerId: 'w1', cycleId: 'cy1' }, {}
      );

      const tx2 = new TransactionManager();
      await outboxService.publish([event2], tx2);
      
      // Must fail with Prisma Unique constraint violation (P2002)
      await expect(cycleRepo.commitTransaction(tx2)).rejects.toThrow(/Unique constraint failed/);
    }, 20000);

    it('should persist atomic aggregate + event + outbox behavior', async () => {
      const cycleId = uuidv4();
      const cycle = new WorkerPerformanceCycle(cycleId, uuidv4(), 'cy1', 'DRAFT', 1);
      
      const event = new WorkerPerformanceCycleStartedEvent(
        uuidv4(), cycleId, 1, new Date(), { workerId: cycle.workerId, cycleId: 'cy1' }, {}
      );

      const tx = await cycleRepo.beginTransaction();
      await cycleRepo.save(cycle, tx);
      await outboxService.publish([event], tx);
      await cycleRepo.commitTransaction(tx);

      const cycleSaved = await prisma.workerPerformanceCycle.findUnique({ where: { id: cycleId } });
      const eventSaved = await prisma.performanceEvent.findFirst({ where: { aggregateId: cycleId } });
      const outboxSaved = await prisma.timeTrackingOutbox.findFirst({ where: { eventId: event.eventId } });

      expect(cycleSaved).toBeDefined();
      expect(eventSaved).toBeDefined();
      expect(outboxSaved).toBeDefined();
      expect(eventSaved?.aggregateVersion).toBe(1);
    }, 20000);
  });

  describe('Transaction Rollback Behavior', () => {
    it('should execute rollback preventing partial persistence', async () => {
      const cycleId = uuidv4();
      const cycle = new WorkerPerformanceCycle(cycleId, uuidv4(), 'cy1', 'DRAFT', 1);

      const tx = await cycleRepo.beginTransaction();
      await cycleRepo.save(cycle, tx);
      
      await cycleRepo.rollbackTransaction(tx);

      // Operations cleared, but we didn't call commit anyway. 
      // Rollback mainly prevents reuse. 
      // To strictly test rollback in interactive tx, we would throw an error *inside* the closure, 
      // but TransactionManager buffers closures until commitTransaction.
      const txManager = tx as TransactionManager;
      expect(txManager.operations.length).toBe(0);

      const cycleSaved = await prisma.workerPerformanceCycle.findUnique({ where: { id: cycleId } });
      expect(cycleSaved).toBeNull();
    });
  });

});
