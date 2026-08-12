import { PrismaClient } from '@prisma/client';
import { 
  WorkerPerformanceCycleRepository, 
  PerformanceScoringPolicyRepository, 
  PerformanceEventOutboxService 
} from '../../../application/performance/interfaces/Repositories';
import { WorkerPerformanceCycle } from '../../../domain/aggregates/performance/WorkerPerformanceCycle.aggregate';
import { PerformanceScoringPolicy } from '../../../domain/aggregates/performance/PerformanceScoringPolicy.aggregate';
import { WorkerObjective } from '../../../domain/aggregates/performance/entities/WorkerObjective.entity';
import { KeyResult } from '../../../domain/aggregates/performance/entities/KeyResult.entity';
import { ManagerEvaluation } from '../../../domain/aggregates/performance/entities/ManagerEvaluation.entity';

export class TransactionManager {
  public operations: ((tx: any) => Promise<any>)[] = [];
}

export class PrismaWorkerPerformanceCycleRepository implements WorkerPerformanceCycleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(workerId: string): Promise<WorkerPerformanceCycle | null> {
    const data = await this.prisma.workerPerformanceCycle.findFirst({
      where: { workerId },
      include: { 
        objectives: { include: { keyResults: true } }, 
        evaluations: true 
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!data) return null;
    
    const cycle = new WorkerPerformanceCycle(
      data.id,
      data.workerId,
      data.cycleId,
      data.status as any,
      data.aggregateVersion
    );
    cycle.finalScore = data.finalScore;
    cycle.finalRating = data.finalRating as any;
    cycle.adherenceSnapshot = data.adherenceSnapshot as any;
    cycle.policySnapshot = data.policySnapshot;
    
    cycle.objectives = data.objectives.map((obj) => {
      const o = new WorkerObjective(obj.id, obj.title, obj.description, obj.weight);
      o.keyResults = obj.keyResults.map(krObj => {
        const kr = new KeyResult(krObj.id, krObj.title, krObj.targetValue, krObj.unit);
        kr.currentValue = krObj.currentValue;
        return kr;
      });
      return o;
    });

    cycle.evaluations = data.evaluations.map((ev) => {
      return new ManagerEvaluation(ev.id, ev.managerId, ev.rating as any, ev.feedbackEncrypted);
    });

    return cycle;
  }

  async save(cycle: WorkerPerformanceCycle, tx: any): Promise<void> {
    const manager = tx as TransactionManager;
    
    manager.operations.push(async (prismaTx: any) => {
      if (cycle.aggregateVersion === 1) {
        // First insert
        await prismaTx.workerPerformanceCycle.create({
          data: {
            id: cycle.id,
            workerId: cycle.workerId,
            cycleId: cycle.cycleId,
            status: cycle.status,
            finalScore: cycle.finalScore,
            finalRating: cycle.finalRating,
            adherenceSnapshot: cycle.adherenceSnapshot as any,
            policySnapshot: cycle.policySnapshot as any,
            aggregateVersion: cycle.aggregateVersion,
          }
        });
      } else {
        // Optimistic concurrency update
        const result = await prismaTx.workerPerformanceCycle.updateMany({
          where: { 
            id: cycle.id, 
            aggregateVersion: cycle.aggregateVersion - 1 
          },
          data: {
            status: cycle.status,
            finalScore: cycle.finalScore,
            finalRating: cycle.finalRating,
            adherenceSnapshot: cycle.adherenceSnapshot as any,
            policySnapshot: cycle.policySnapshot as any,
            aggregateVersion: cycle.aggregateVersion,
          }
        });

        if (result.count === 0) {
          throw new Error(`ConcurrencyException: Aggregate ${cycle.id} version update from ${cycle.aggregateVersion - 1} failed.`);
        }
      }

      // Handle child records
      // 5. Review child-record persistence
      // DeleteMany is destructive and can lose disconnected entities if someone holds a reference, but it's safe for 
      // these owned value-objects because they are strictly aggregate-bound and have no external relations. 
      // It's the standard DDD aggregate persistence pattern without a full diff engine.
      await prismaTx.workerObjective.deleteMany({ where: { workerPerformanceCycleId: cycle.id } });
      await prismaTx.managerEvaluation.deleteMany({ where: { workerPerformanceCycleId: cycle.id } });

      for (const obj of cycle.objectives) {
        await prismaTx.workerObjective.create({
          data: {
            id: obj.id,
            workerPerformanceCycleId: cycle.id,
            title: obj.title,
            description: obj.description,
            weight: obj.weight,
            status: 'ACTIVE',
            keyResults: {
              create: obj.keyResults.map(kr => ({
                id: kr.id,
                title: kr.title,
                targetValue: kr.targetValue,
                currentValue: kr.currentValue,
                unit: kr.unit
              }))
            }
          }
        });
      }

      for (const ev of cycle.evaluations) {
        await prismaTx.managerEvaluation.create({
          data: {
            id: ev.id,
            workerPerformanceCycleId: cycle.id,
            managerId: ev.managerId,
            rating: ev.rating,
            feedbackEncrypted: ev.feedbackEncrypted
          }
        });
      }
    });
  }

  async beginTransaction(): Promise<any> {
    return new TransactionManager();
  }

  async commitTransaction(tx: any): Promise<void> {
    const manager = tx as TransactionManager;
    await this.prisma.$transaction(async (prismaTx) => {
      for (const op of manager.operations) {
        await op(prismaTx);
      }
    });
  }

  async rollbackTransaction(tx: any): Promise<void> {
    const manager = tx as TransactionManager;
    manager.operations = []; // Discard
  }
}

export class PrismaPerformanceScoringPolicyRepository implements PerformanceScoringPolicyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(policyId: string): Promise<PerformanceScoringPolicy | null> {
    const data = await this.prisma.performanceScoringPolicy.findUnique({
      where: { id: policyId }
    });
    if (!data) return null;
    
    const policy = new PerformanceScoringPolicy(
      data.id,
      data.policyId,
      data.version,
      data.effectiveFrom,
      data.okrWeight,
      data.adherenceWeight,
      data.ratingThresholds as any,
      data.aggregateVersion
    );
    policy.effectiveTo = data.effectiveTo;
    policy.status = data.status as any;
    return policy;
  }

  async findActivePolicy(): Promise<PerformanceScoringPolicy | null> {
    const data = await this.prisma.performanceScoringPolicy.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { version: 'desc' }
    });
    if (!data) return null;
    
    const policy = new PerformanceScoringPolicy(
      data.id,
      data.policyId,
      data.version,
      data.effectiveFrom,
      data.okrWeight,
      data.adherenceWeight,
      data.ratingThresholds as any,
      data.aggregateVersion
    );
    policy.effectiveTo = data.effectiveTo;
    policy.status = data.status as any;
    return policy;
  }

  async save(policy: PerformanceScoringPolicy, tx: any): Promise<void> {
    const manager = tx as TransactionManager;

    manager.operations.push(async (prismaTx: any) => {
      if (policy.aggregateVersion === 1) {
        await prismaTx.performanceScoringPolicy.create({
          data: {
            id: policy.id,
            policyId: policy.policyId,
            version: policy.version,
            effectiveFrom: policy.effectiveFrom,
            effectiveTo: policy.effectiveTo,
            status: policy.status,
            okrWeight: policy.okrWeight,
            adherenceWeight: policy.adherenceWeight,
            ratingThresholds: policy.ratingThresholds as any,
            aggregateVersion: policy.aggregateVersion
          }
        });
      } else {
        const result = await prismaTx.performanceScoringPolicy.updateMany({
          where: { 
            id: policy.id, 
            aggregateVersion: policy.aggregateVersion - 1 
          },
          data: {
            effectiveTo: policy.effectiveTo,
            status: policy.status,
            aggregateVersion: policy.aggregateVersion
          }
        });

        if (result.count === 0) {
          throw new Error(`ConcurrencyException: Aggregate ${policy.id} version update from ${policy.aggregateVersion - 1} failed.`);
        }
      }
    });
  }
}

export class PrismaPerformanceEventOutboxService implements PerformanceEventOutboxService {
  constructor(private readonly prisma: PrismaClient) {}

  async publish(events: ReadonlyArray<any>, tx: any): Promise<void> {
    const manager = tx as TransactionManager;

    for (const event of events) {
      manager.operations.push(async (prismaTx: any) => {
        // 1. Save to physical Event Store (PerformanceEvent)
        await prismaTx.performanceEvent.create({
          data: {
            eventId: event.eventId,
            aggregateId: event.aggregateId,
            aggregateVersion: event.eventVersion || event.aggregateVersion,
            eventType: event.constructor.name || event.eventType,
            payload: event.payload,
            metadata: event.metadata || {},
            timestamp: event.timestamp || new Date()
          }
        });

        // 2. Save to generalized Outbox (TimeTrackingOutbox)
        await prismaTx.timeTrackingOutbox.create({
          data: {
            eventId: event.eventId,
            eventType: event.constructor.name || event.eventType,
            payload: JSON.parse(JSON.stringify(event)), // Serialize correctly
            published: false
          }
        });
      });
    }
  }
}
