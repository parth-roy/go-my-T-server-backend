import { PrismaClient } from '@prisma/client';
import { BaseProjector, ProjectionContext } from '../../../application/compliance/cqrs/projectors/BaseProjector';

export class WorkerPerformanceDashboardProjector extends BaseProjector {
  constructor(private readonly prisma: PrismaClient) {
    super('WorkerPerformanceDashboard');
  }

  protected async handleEvent(event: any, context: ProjectionContext): Promise<void> {
    const tx = context.tx || this.prisma;
    const workerId = event.aggregateId; // For 1:1 worker to cycle, aggregateId is workerId. Wait, for cycle, aggregateId is workerId.

    switch (event.eventType) {
      case 'WorkerPerformanceCycleStartedEvent':
        await tx.workerPerformanceDashboard.upsert({
          where: {
            workerId_cycleId: { workerId: event.payload.workerId, cycleId: event.payload.cycleId }
          },
          create: {
            id: event.aggregateId,
            workerId: event.payload.workerId,
            cycleId: event.payload.cycleId,
            status: 'ACTIVE',
            objectivesProgress: [],
            latestAdherenceSnapshot: null,
            projectionVersion: '1.0'
          },
          update: {
            status: 'ACTIVE'
          }
        });
        break;

      case 'WorkerObjectiveAddedEvent': {
        const dashboard = await tx.workerPerformanceDashboard.findFirst({ where: { workerId: event.payload.workerId, cycleId: event.payload.cycleId } });
        if (dashboard) {
          const objectives = Array.isArray(dashboard.objectivesProgress) ? dashboard.objectivesProgress : [];
          objectives.push({
            id: event.payload.objectiveId,
            title: event.payload.title,
            weight: event.payload.weight,
            keyResults: []
          });
          await tx.workerPerformanceDashboard.update({
            where: { id: dashboard.id },
            data: { objectivesProgress: objectives }
          });
        }
        break;
      }

      case 'KeyResultProgressUpdatedEvent': {
        const dashboard = await tx.workerPerformanceDashboard.findFirst({ where: { workerId: event.payload.workerId, cycleId: event.payload.cycleId } });
        if (dashboard) {
          const objectives = Array.isArray(dashboard.objectivesProgress) ? dashboard.objectivesProgress : [];
          const obj = objectives.find((o: any) => o.id === event.payload.objectiveId);
          if (obj) {
            // Update or add KR
            const kr = obj.keyResults.find((k: any) => k.id === event.payload.keyResultId);
            if (kr) {
              kr.currentValue = event.payload.currentValue;
            } else {
              obj.keyResults.push({
                id: event.payload.keyResultId,
                currentValue: event.payload.currentValue
              });
            }
          }
          await tx.workerPerformanceDashboard.update({
            where: { id: dashboard.id },
            data: { objectivesProgress: objectives }
          });
        }
        break;
      }

      case 'WorkerPerformanceCycleScoredEvent': {
        const dashboard = await tx.workerPerformanceDashboard.findFirst({ where: { workerId: event.payload.workerId, cycleId: event.payload.cycleId } });
        if (dashboard) {
          await tx.workerPerformanceDashboard.update({
            where: { id: dashboard.id },
            data: { 
              status: 'CLOSED',
              latestAdherenceSnapshot: event.payload.adherenceSnapshot
            }
          });
        }
        break;
      }
      
      case 'WorkerPerformanceCycleClosedEvent': {
        const dashboard = await tx.workerPerformanceDashboard.findFirst({ where: { workerId: event.payload.workerId, cycleId: event.payload.cycleId } });
        if (dashboard) {
          await tx.workerPerformanceDashboard.update({
            where: { id: dashboard.id },
            data: { status: 'CLOSED' }
          });
        }
        break;
      }
      
      case 'WorkerPerformanceCycleReopenedEvent': {
        const dashboard = await tx.workerPerformanceDashboard.findFirst({ where: { workerId: event.payload.workerId, cycleId: event.payload.cycleId } });
        if (dashboard) {
          await tx.workerPerformanceDashboard.update({
            where: { id: dashboard.id },
            data: { status: 'ACTIVE' }
          });
        }
        break;
      }
    }
  }

  protected async isEventProcessed(eventId: string, context: ProjectionContext): Promise<boolean> {
    const tx = context.tx || this.prisma;
    const checkpoint = await tx.projectionCheckpoint.findUnique({
      where: { projectionName: `${this.projectorName}_${eventId}` }
    });
    return !!checkpoint;
  }

  protected async getCurrentAggregateVersion(aggregateId: string, context: ProjectionContext): Promise<number> {
    const tx = context.tx || this.prisma;
    const checkpoint = await tx.projectionCheckpoint.findUnique({
      where: { projectionName: `${this.projectorName}_${aggregateId}_v` }
    });
    // In BaseProjector, it throws if version > currentVersion + 1. 
    // Wait, we need to return the last event version handled.
    if (!checkpoint) return 0;
    // We can store version in lastEventId as a stringified number just to reuse the schema column safely
    return parseInt(checkpoint.lastEventId, 10) || 0;
  }

  protected async updateCheckpoint(event: any, context: ProjectionContext): Promise<void> {
    const tx = context.tx || this.prisma;
    
    // Mark event as processed
    await tx.projectionCheckpoint.upsert({
      where: { projectionName: `${this.projectorName}_${event.eventId}` },
      create: { projectionName: `${this.projectorName}_${event.eventId}`, lastEventId: event.eventId },
      update: { lastEventId: event.eventId }
    });

    // Update aggregate version
    await tx.projectionCheckpoint.upsert({
      where: { projectionName: `${this.projectorName}_${event.aggregateId}_v` },
      create: { projectionName: `${this.projectorName}_${event.aggregateId}_v`, lastEventId: String(event.eventVersion || event.aggregateVersion) },
      update: { lastEventId: String(event.eventVersion || event.aggregateVersion) }
    });
  }
}
