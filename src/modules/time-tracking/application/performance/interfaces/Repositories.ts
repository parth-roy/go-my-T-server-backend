import { WorkerPerformanceCycle } from '../../../domain/aggregates/performance/WorkerPerformanceCycle.aggregate';
import { PerformanceScoringPolicy } from '../../../domain/aggregates/performance/PerformanceScoringPolicy.aggregate';

export interface WorkerPerformanceCycleRepository {
  findById(workerId: string): Promise<WorkerPerformanceCycle | null>;
  save(cycle: WorkerPerformanceCycle, tx: any): Promise<void>;
  beginTransaction(): Promise<any>;
  commitTransaction(tx: any): Promise<void>;
  rollbackTransaction(tx: any): Promise<void>;
}

export interface PerformanceScoringPolicyRepository {
  findById(policyId: string): Promise<PerformanceScoringPolicy | null>;
  findActivePolicy(): Promise<PerformanceScoringPolicy | null>;
  save(policy: PerformanceScoringPolicy, tx: any): Promise<void>;
}

export interface WorkerAdherenceReadModelRepository {
  /**
   * Retrieves the latest deterministic adherence snapshot for a given worker.
   * When multiple exist, highest logical aggregateVersion wins.
   */
  getLatestAdherenceForWorker(workerId: string): Promise<any | null>;
}

export interface PerformanceEventOutboxService {
  publish(events: ReadonlyArray<any>, tx: any): Promise<void>;
}

export interface PerformanceAuthorizationService {
  /**
   * Throws an error if the actor is not authorized to perform the action on the resource.
   * Actions: CREATE_CYCLE, UPDATE_KR, SUBMIT_EVALUATION, SCORE_CYCLE, CALIBRATE, MANAGE_POLICY, CLOSE_CYCLE
   */
  checkPermission(actorId: string, action: string, resourceId: string): Promise<void>;
}
