import { DesignationStatus } from '../enums/designation-status.enum';
import { AppError } from '@shared/errors/AppError';

export interface DesignationProps {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description: string | null;
  level: number | null;
  status: DesignationStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class DesignationEntity {
  private props: DesignationProps;

  private constructor(props: DesignationProps) {
    this.props = { ...props };
  }

  static create(props: DesignationProps): DesignationEntity {
    return new DesignationEntity(props);
  }

  static reconstitute(props: DesignationProps): DesignationEntity {
    return new DesignationEntity(props);
  }

  // Getters
  get id(): string { return this.props.id; }
  get organizationId(): string { return this.props.organizationId; }
  get name(): string { return this.props.name; }
  get code(): string { return this.props.code; }
  get description(): string | null { return this.props.description; }
  get level(): number | null { return this.props.level; }
  get status(): DesignationStatus { return this.props.status; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get deletedAt(): Date | null { return this.props.deletedAt; }

  // Behaviors
  update(
    params: { name?: string; description?: string | null; level?: number | null; status?: DesignationStatus },
    now: Date = new Date()
  ): void {
    if (this.props.status === DesignationStatus.ARCHIVED) {
      throw AppError.badRequest('Cannot update an archived designation');
    }

    if (params.name !== undefined) this.props.name = params.name;
    if (params.description !== undefined) this.props.description = params.description;
    if (params.level !== undefined) this.props.level = params.level;
    if (params.status !== undefined) this.props.status = params.status;
    
    this.props.updatedAt = now;
  }

  archive(now: Date = new Date()): void {
    if (this.props.status === DesignationStatus.ARCHIVED) {
      return;
    }
    
    this.props.status = DesignationStatus.ARCHIVED;
    this.props.deletedAt = now;
    this.props.updatedAt = now;
  }

  toJSON(): DesignationProps {
    return { ...this.props };
  }
}
