import { DepartmentStatus } from '../enums/department-status.enum';
import { AppError } from '@shared/errors/AppError';

export interface DepartmentProps {
  id: string;
  organizationId: string;
  branchId: string;
  name: string;
  code: string;
  description: string | null;
  managerId: string | null;
  status: DepartmentStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class DepartmentEntity {
  private props: DepartmentProps;

  private constructor(props: DepartmentProps) {
    this.props = { ...props };
  }

  static create(props: DepartmentProps): DepartmentEntity {
    return new DepartmentEntity(props);
  }

  static reconstitute(props: DepartmentProps): DepartmentEntity {
    return new DepartmentEntity(props);
  }

  // Getters
  get id(): string { return this.props.id; }
  get organizationId(): string { return this.props.organizationId; }
  get branchId(): string { return this.props.branchId; }
  get name(): string { return this.props.name; }
  get code(): string { return this.props.code; }
  get description(): string | null { return this.props.description; }
  get managerId(): string | null { return this.props.managerId; }
  get status(): DepartmentStatus { return this.props.status; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get deletedAt(): Date | null { return this.props.deletedAt; }

  // Behaviors
  update(
    params: { name?: string; description?: string | null; managerId?: string | null; status?: DepartmentStatus },
    now: Date = new Date()
  ): void {
    if (this.props.status === DepartmentStatus.ARCHIVED) {
      throw AppError.badRequest('Cannot update an archived department');
    }

    if (params.name !== undefined) this.props.name = params.name;
    if (params.description !== undefined) this.props.description = params.description;
    if (params.managerId !== undefined) this.props.managerId = params.managerId;
    if (params.status !== undefined) this.props.status = params.status;
    
    this.props.updatedAt = now;
  }

  archive(now: Date = new Date()): void {
    if (this.props.status === DepartmentStatus.ARCHIVED) {
      return;
    }
    
    this.props.status = DepartmentStatus.ARCHIVED;
    this.props.deletedAt = now;
    this.props.updatedAt = now;
  }

  toJSON(): DepartmentProps {
    return { ...this.props };
  }
}
