import { PerformanceApplicationService } from '../../services/PerformanceApplicationService';
import {
  CreateWorkerPerformanceCycleCommand,
  CloseWorkerPerformanceCycleCommand,
  ReopenWorkerPerformanceCycleCommand,
  AddWorkerObjectiveCommand,
  AddKeyResultCommand,
  UpdateKeyResultProgressCommand,
  SubmitManagerEvaluationCommand,
  ApplyCalibrationAdjustmentCommand,
  ScoreWorkerPerformanceCycleCommand,
  CreatePerformanceScoringPolicyCommand,
  ActivatePerformanceScoringPolicyCommand,
  ArchivePerformanceScoringPolicyCommand
} from '../PerformanceCommands';

export class CreateWorkerPerformanceCycleHandler {
  constructor(private service: PerformanceApplicationService) {}
  async handle(command: CreateWorkerPerformanceCycleCommand): Promise<void> {
    await this.service.createWorkerPerformanceCycle(command);
  }
}

export class AddWorkerObjectiveHandler {
  constructor(private service: PerformanceApplicationService) {}
  async handle(command: AddWorkerObjectiveCommand): Promise<void> {
    await this.service.addObjective(command);
  }
}

export class UpdateKeyResultProgressHandler {
  constructor(private service: PerformanceApplicationService) {}
  async handle(command: UpdateKeyResultProgressCommand): Promise<void> {
    await this.service.updateKeyResultProgress(command);
  }
}

export class SubmitManagerEvaluationHandler {
  constructor(private service: PerformanceApplicationService) {}
  async handle(command: SubmitManagerEvaluationCommand): Promise<void> {
    await this.service.submitManagerEvaluation(command);
  }
}

export class ApplyCalibrationAdjustmentHandler {
  constructor(private service: PerformanceApplicationService) {}
  async handle(command: ApplyCalibrationAdjustmentCommand): Promise<void> {
    await this.service.calibrate(command);
  }
}

export class ScoreWorkerPerformanceCycleHandler {
  constructor(private service: PerformanceApplicationService) {}
  async handle(command: ScoreWorkerPerformanceCycleCommand): Promise<void> {
    await this.service.scoreWorkerPerformanceCycle(command);
  }
}

export class CreatePerformanceScoringPolicyHandler {
  constructor(private service: PerformanceApplicationService) {}
  async handle(command: CreatePerformanceScoringPolicyCommand): Promise<void> {
    await this.service.createScoringPolicy(command);
  }
}

export class ActivatePerformanceScoringPolicyHandler {
  constructor(private service: PerformanceApplicationService) {}
  async handle(command: ActivatePerformanceScoringPolicyCommand): Promise<void> {
    await this.service.activateScoringPolicy(command);
  }
}
