import { PrismaClient } from '@prisma/client';
import { PerformanceApplicationService } from '../application/performance/services/PerformanceApplicationService';
import { PrismaWorkerPerformanceCycleRepository, PrismaPerformanceScoringPolicyRepository, PrismaPerformanceEventOutboxService } from './repositories/performance/PrismaPerformanceRepositories';
import { WorkerPerformanceDashboardProjector } from './projectors/performance/WorkerPerformanceDashboardProjector';
import { 
  WorkerAdherenceReadRepositoryImpl,
  WorkerPerformanceDashboardReadRepositoryImpl,
  PerformancePolicyReadRepositoryImpl 
} from './repositories/performance/WorkerPerformanceReadRepositories';
import { PerformanceAuthorizationService } from '../application/performance/interfaces/Repositories';
import { RealPerformanceAuthorizationService } from './auth/RealPerformanceAuthorizationService';
import { RequestContext } from '../../../shared/context/request-context';
import { AppError } from '../../../shared/errors/AppError';

import {
  GetWorkerPerformanceCycleHandler,
  ListWorkerPerformanceCyclesHandler,
  GetWorkerPerformanceDashboardHandler,
  GetWorkerPerformanceObjectivesHandler,
  GetPerformancePolicyHandler,
  ListPerformancePoliciesHandler,
  GetWorkerAdherenceSnapshotHandler
} from '../application/performance/queries/handlers/PerformanceQueryHandlers';

class FailSafePerformanceAuthorizationService implements PerformanceAuthorizationService {
  async checkPermission(actorId: string, action: string, resourceId: string): Promise<void> {
    throw AppError.forbidden('NotImplementedError: Real IAM dependency is missing. Cannot proceed with unauthorized API integration in Phase 6.');
  }
}

export class PerformanceModuleDI {
  public cycleRepo: PrismaWorkerPerformanceCycleRepository;
  public policyRepo: PrismaPerformanceScoringPolicyRepository;
  public outboxService: PrismaPerformanceEventOutboxService;
  
  public dashboardReadRepo: WorkerPerformanceDashboardReadRepositoryImpl;
  public policyReadRepo: PerformancePolicyReadRepositoryImpl;
  public adherenceRepo: WorkerAdherenceReadRepositoryImpl;
  
  public authService: PerformanceAuthorizationService;
  
  public appService: PerformanceApplicationService;

  public dashboardProjector: WorkerPerformanceDashboardProjector;
  // Query Handlers
  public getWorkerPerformanceCycleHandler: GetWorkerPerformanceCycleHandler;
  public listWorkerPerformanceCyclesHandler: ListWorkerPerformanceCyclesHandler;
  public getWorkerPerformanceDashboardHandler: GetWorkerPerformanceDashboardHandler;
  public getWorkerPerformanceObjectivesHandler: GetWorkerPerformanceObjectivesHandler;
  public getPerformancePolicyHandler: GetPerformancePolicyHandler;
  public listPerformancePoliciesHandler: ListPerformancePoliciesHandler;
  public getWorkerAdherenceSnapshotHandler: GetWorkerAdherenceSnapshotHandler;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly context?: RequestContext
  ) {
    // 1. Repositories & Outbox
    this.cycleRepo = new PrismaWorkerPerformanceCycleRepository(this.prisma);
    this.policyRepo = new PrismaPerformanceScoringPolicyRepository(this.prisma);
    this.outboxService = new PrismaPerformanceEventOutboxService(this.prisma);
    
    this.dashboardReadRepo = new WorkerPerformanceDashboardReadRepositoryImpl(this.prisma);
    this.policyReadRepo = new PerformancePolicyReadRepositoryImpl(this.prisma);
    this.adherenceRepo = new WorkerAdherenceReadRepositoryImpl(this.prisma);
    
    // Auth mechanism: inject actual IAM resolution if context is provided
    if (this.context) {
      this.authService = new RealPerformanceAuthorizationService(this.prisma, this.context);
    } else {
      this.authService = new FailSafePerformanceAuthorizationService();
    }

    // 2. Projectors (Phase 4 wiring)
    this.dashboardProjector = new WorkerPerformanceDashboardProjector(this.prisma);
    // 3. Application Service
    this.appService = new PerformanceApplicationService(
      this.cycleRepo,
      this.policyRepo,
      this.adherenceRepo,
      this.outboxService,
      this.authService,
      this.context?.user?.id || 'system'
    );

    // 4. Query Handlers
    const actorId = this.context?.user?.id || 'system';
    this.getWorkerPerformanceCycleHandler = new GetWorkerPerformanceCycleHandler(this.dashboardReadRepo, this.authService, actorId);
    this.listWorkerPerformanceCyclesHandler = new ListWorkerPerformanceCyclesHandler(this.dashboardReadRepo, this.authService, actorId);
    this.getWorkerPerformanceDashboardHandler = new GetWorkerPerformanceDashboardHandler(this.dashboardReadRepo, this.authService, actorId);
    this.getWorkerPerformanceObjectivesHandler = new GetWorkerPerformanceObjectivesHandler(this.dashboardReadRepo, this.authService, actorId);
    this.getPerformancePolicyHandler = new GetPerformancePolicyHandler(this.policyReadRepo, this.authService, actorId);
    this.listPerformancePoliciesHandler = new ListPerformancePoliciesHandler(this.policyReadRepo, this.authService, actorId);
    this.getWorkerAdherenceSnapshotHandler = new GetWorkerAdherenceSnapshotHandler(this.adherenceRepo, this.authService, actorId);
  }

  public async handleDomainEvent(event: any): Promise<void> {
    await this.dashboardProjector.project(event, { tx: this.prisma });
  }

  public async handleIntegrationEvent(event: any): Promise<void> {
    // Phase 5: Integrate external events here
  }
}
