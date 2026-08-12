import { PerformanceModuleDI } from '../../../infrastructure/PerformanceModuleDI';
import {
  CreateWorkerPerformanceCycleCommand,
  CloseWorkerPerformanceCycleCommand,
  ReopenWorkerPerformanceCycleCommand,
  AddWorkerObjectiveCommand,
  AddKeyResultCommand,
  UpdateKeyResultProgressCommand,
  SubmitManagerEvaluationCommand,
  ApplyCalibrationAdjustmentCommand,
  ScoreWorkerPerformanceCycleCommand
} from '../../../application/performance/commands/PerformanceCommands';
import {
  GetWorkerPerformanceCycleQuery,
  ListWorkerPerformanceCyclesQuery,
  GetWorkerPerformanceDashboardQuery,
  GetWorkerPerformanceObjectivesQuery,
  GetWorkerAdherenceSnapshotQuery
} from '../../../application/performance/queries/PerformanceQueries';

export class WorkerPerformanceController {
  constructor(private readonly di: PerformanceModuleDI) {}

  private handleError(error: any, res: any): void {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'An unexpected error occurred.',
      code: error.code || 'INTERNAL_ERROR'
    });
  }

  // --- COMMANDS ---

  public async createCycle(req: any, res: any): Promise<void> {
    try {
      const { workerId, cycleId } = req.body;
      const command = new CreateWorkerPerformanceCycleCommand(workerId, cycleId);
      await this.di.appService.createWorkerPerformanceCycle(command);
      res.status(201).json({ success: true, message: 'Performance cycle created.', data: null });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  public async closeCycle(req: any, res: any): Promise<void> {
    try {
      const { reason } = req.body;
      const workerId = req.params.workerId;
      const command = new CloseWorkerPerformanceCycleCommand(workerId, reason);
      await this.di.appService.closeWorkerPerformanceCycle(command);
      res.status(200).json({ success: true, message: 'Performance cycle closed.', data: null });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  public async reopenCycle(req: any, res: any): Promise<void> {
    try {
      const { reason } = req.body;
      const workerId = req.params.workerId;
      const command = new ReopenWorkerPerformanceCycleCommand(workerId, reason);
      await this.di.appService.reopenWorkerPerformanceCycle(command);
      res.status(200).json({ success: true, message: 'Performance cycle reopened.', data: null });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  public async addObjective(req: any, res: any): Promise<void> {
    try {
      const { objectiveId, title, weight, description } = req.body;
      const workerId = req.params.workerId;
      const command = new AddWorkerObjectiveCommand(workerId, objectiveId, title, weight, description);
      await this.di.appService.addObjective(command);
      res.status(201).json({ success: true, message: 'Objective added.', data: null });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  public async addKeyResult(req: any, res: any): Promise<void> {
    try {
      const { keyResultId, title, targetValue, unit } = req.body;
      const { workerId, objectiveId } = req.params;
      const command = new AddKeyResultCommand(workerId, objectiveId, keyResultId, title, targetValue, unit);
      await this.di.appService.addKeyResult(command);
      res.status(201).json({ success: true, message: 'Key result added.', data: null });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  public async updateKeyResultProgress(req: any, res: any): Promise<void> {
    try {
      const { currentValue } = req.body;
      const { workerId, objectiveId, keyResultId } = req.params;
      const command = new UpdateKeyResultProgressCommand(workerId, objectiveId, keyResultId, currentValue);
      await this.di.appService.updateKeyResultProgress(command);
      res.status(200).json({ success: true, message: 'Key result progress updated.', data: null });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  public async submitEvaluation(req: any, res: any): Promise<void> {
    try {
      const { evaluationId, rating, feedbackEncrypted, encryptionKeyId } = req.body;
      const workerId = req.params.workerId;
      const managerId = req.context?.user?.id || 'system';
      const command = new SubmitManagerEvaluationCommand(
        workerId, evaluationId, managerId, rating, feedbackEncrypted, encryptionKeyId
      );
      await this.di.appService.submitManagerEvaluation(command);
      res.status(200).json({ success: true, message: 'Evaluation submitted.', data: null });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  public async calibrate(req: any, res: any): Promise<void> {
    try {
      const { newRating, reason } = req.body;
      const workerId = req.params.workerId;
      const hrUserId = req.context?.user?.id || 'system';
      const command = new ApplyCalibrationAdjustmentCommand(workerId, newRating, reason, hrUserId);
      await this.di.appService.calibrate(command);
      res.status(200).json({ success: true, message: 'Calibration applied.', data: null });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  public async scoreCycle(req: any, res: any): Promise<void> {
    try {
      const workerId = req.params.workerId;
      const command = new ScoreWorkerPerformanceCycleCommand(workerId);
      await this.di.appService.scoreWorkerPerformanceCycle(command);
      res.status(200).json({ success: true, message: 'Cycle scored.', data: null });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  // --- QUERIES ---

  public async getCycle(req: any, res: any): Promise<void> {
    try {
      const { workerId, cycleId } = req.params;
      const query = new GetWorkerPerformanceCycleQuery(workerId, cycleId);
      const data = await this.di.getWorkerPerformanceCycleHandler.handle(query);
      res.status(200).json({ success: true, data });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  public async listCycles(req: any, res: any): Promise<void> {
    try {
      const workerId = req.params.workerId;
      const query = new ListWorkerPerformanceCyclesQuery(workerId);
      const data = await this.di.listWorkerPerformanceCyclesHandler.handle(query);
      res.status(200).json({ success: true, data });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  public async getDashboard(req: any, res: any): Promise<void> {
    try {
      const workerId = req.params.workerId;
      const query = new GetWorkerPerformanceDashboardQuery(workerId);
      const data = await this.di.getWorkerPerformanceDashboardHandler.handle(query);
      res.status(200).json({ success: true, data });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  public async getObjectives(req: any, res: any): Promise<void> {
    try {
      const { workerId, cycleId } = req.params;
      const query = new GetWorkerPerformanceObjectivesQuery(workerId, cycleId);
      const data = await this.di.getWorkerPerformanceObjectivesHandler.handle(query);
      res.status(200).json({ success: true, data });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  public async getAdherenceSnapshot(req: any, res: any): Promise<void> {
    try {
      const { workerId, cycleId } = req.params;
      const query = new GetWorkerAdherenceSnapshotQuery(workerId, cycleId);
      const data = await this.di.getWorkerAdherenceSnapshotHandler.handle(query);
      res.status(200).json({ success: true, data });
    } catch (error) {
      this.handleError(error, res);
    }
  }
}
