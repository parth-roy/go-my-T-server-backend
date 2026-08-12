import {
  GetWorkerPerformanceCycleQuery,
  ListWorkerPerformanceCyclesQuery,
  GetWorkerPerformanceDashboardQuery,
  GetWorkerPerformanceObjectivesQuery,
  GetPerformancePolicyQuery,
  ListPerformancePoliciesQuery,
  GetWorkerAdherenceSnapshotQuery
} from '../PerformanceQueries';
import { PerformanceAuthorizationService } from '../../interfaces/Repositories';

// Mock read model repositories
export interface WorkerPerformanceDashboardReadRepository {
  getDashboard(workerId: string): Promise<any>;
  getCycle(workerId: string, cycleId: string): Promise<any>;
  listCycles(workerId: string): Promise<any[]>;
  getObjectives(workerId: string, cycleId: string): Promise<any[]>;
}

export interface PerformancePolicyReadRepository {
  getPolicy(policyId: string): Promise<any>;
  listPolicies(status?: string): Promise<any[]>;
}

export interface WorkerAdherenceReadRepository {
  getSnapshot(workerId: string, cycleId: string): Promise<any>;
}

export class GetWorkerPerformanceCycleHandler {
  constructor(
    private readRepo: WorkerPerformanceDashboardReadRepository,
    private authService: PerformanceAuthorizationService,
    private readonly currentActorId: string = 'system'
  ) {}
  
  async handle(query: GetWorkerPerformanceCycleQuery): Promise<any> {
    await this.authService.checkPermission(this.currentActorId, 'READ_CYCLE', query.workerId);
    return this.readRepo.getCycle(query.workerId, query.cycleId);
  }
}

export class ListWorkerPerformanceCyclesHandler {
  constructor(
    private readRepo: WorkerPerformanceDashboardReadRepository,
    private authService: PerformanceAuthorizationService,
    private readonly currentActorId: string = 'system'
  ) {}
  
  async handle(query: ListWorkerPerformanceCyclesQuery): Promise<any[]> {
    await this.authService.checkPermission(this.currentActorId, 'READ_CYCLE', query.workerId);
    return this.readRepo.listCycles(query.workerId);
  }
}

export class GetWorkerPerformanceDashboardHandler {
  constructor(
    private readRepo: WorkerPerformanceDashboardReadRepository,
    private authService: PerformanceAuthorizationService,
    private readonly currentActorId: string = 'system'
  ) {}
  
  async handle(query: GetWorkerPerformanceDashboardQuery): Promise<any> {
    await this.authService.checkPermission(this.currentActorId, 'READ_DASHBOARD', query.workerId);
    return this.readRepo.getDashboard(query.workerId);
  }
}

export class GetWorkerPerformanceObjectivesHandler {
  constructor(
    private readRepo: WorkerPerformanceDashboardReadRepository,
    private authService: PerformanceAuthorizationService,
    private readonly currentActorId: string = 'system'
  ) {}
  
  async handle(query: GetWorkerPerformanceObjectivesQuery): Promise<any[]> {
    await this.authService.checkPermission(this.currentActorId, 'READ_OBJECTIVES', query.workerId);
    return this.readRepo.getObjectives(query.workerId, query.cycleId);
  }
}

export class GetPerformancePolicyHandler {
  constructor(
    private readRepo: PerformancePolicyReadRepository,
    private authService: PerformanceAuthorizationService,
    private readonly currentActorId: string = 'system'
  ) {}
  
  async handle(query: GetPerformancePolicyQuery): Promise<any> {
    await this.authService.checkPermission(this.currentActorId, 'READ_POLICY', query.policyId);
    return this.readRepo.getPolicy(query.policyId);
  }
}

export class ListPerformancePoliciesHandler {
  constructor(
    private readRepo: PerformancePolicyReadRepository,
    private authService: PerformanceAuthorizationService,
    private readonly currentActorId: string = 'system'
  ) {}
  
  async handle(query: ListPerformancePoliciesQuery): Promise<any[]> {
    await this.authService.checkPermission(this.currentActorId, 'READ_POLICY', 'system');
    return this.readRepo.listPolicies(query.status);
  }
}

export class GetWorkerAdherenceSnapshotHandler {
  constructor(
    private readRepo: WorkerAdherenceReadRepository,
    private authService: PerformanceAuthorizationService,
    private readonly currentActorId: string = 'system'
  ) {}
  
  async handle(query: GetWorkerAdherenceSnapshotQuery): Promise<any> {
    await this.authService.checkPermission(this.currentActorId, 'READ_ADHERENCE', query.workerId);
    return this.readRepo.getSnapshot(query.workerId, query.cycleId);
  }
}
