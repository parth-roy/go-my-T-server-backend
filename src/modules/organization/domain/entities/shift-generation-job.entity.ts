import { ShiftGenerationJobStatus, ShiftGenerationTrigger } from '@prisma/client';

export interface ShiftGenerationJobProps {
  id: string;
  organizationId: string;
  windowStart: Date;
  windowEnd: Date;
  status: ShiftGenerationJobStatus;
  generatedCount: number;
  skippedCount: number;
  failedCount: number;
  startedAt?: Date;
  completedAt?: Date;
  trigger: ShiftGenerationTrigger;
  createdAt: Date;
  updatedAt: Date;
}

export class ShiftGenerationJobEntity {
  private constructor(private props: ShiftGenerationJobProps) {}

  get id(): string { return this.props.id; }
  get organizationId(): string { return this.props.organizationId; }
  get windowStart(): Date { return this.props.windowStart; }
  get windowEnd(): Date { return this.props.windowEnd; }
  get status(): ShiftGenerationJobStatus { return this.props.status; }
  get trigger(): ShiftGenerationTrigger { return this.props.trigger; }
  get generatedCount(): number { return this.props.generatedCount; }

  toJSON() { return this.props; }

  public markProcessing(): void {
    this.props.status = ShiftGenerationJobStatus.PROCESSING;
    this.props.startedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public recordSuccess(generated: number, skipped: number): void {
    this.props.generatedCount += generated;
    this.props.skippedCount += skipped;
  }

  public markCompleted(): void {
    this.props.status = ShiftGenerationJobStatus.COMPLETED;
    this.props.completedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public markFailed(failed: number = 0): void {
    this.props.status = ShiftGenerationJobStatus.FAILED;
    this.props.failedCount += failed;
    this.props.completedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public static create(props: ShiftGenerationJobProps): ShiftGenerationJobEntity {
    return new ShiftGenerationJobEntity(props);
  }

  public static reconstitute(props: ShiftGenerationJobProps): ShiftGenerationJobEntity {
    return new ShiftGenerationJobEntity(props);
  }
}
