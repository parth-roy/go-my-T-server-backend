import { EmploymentCategory } from '@prisma/client';
import { AppError } from '@shared/errors/AppError';

export interface EmploymentTypeProps {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  category: EmploymentCategory;
  rulesConfig: any;
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class EmploymentTypeEntity {
  private props: EmploymentTypeProps;

  private constructor(props: EmploymentTypeProps) {
    this.props = { ...props };
  }

  static create(props: EmploymentTypeProps): EmploymentTypeEntity {
    return new EmploymentTypeEntity(props);
  }

  static reconstitute(props: EmploymentTypeProps): EmploymentTypeEntity {
    return new EmploymentTypeEntity(props);
  }

  // Getters
  get id(): string { return this.props.id; }
  get organizationId(): string { return this.props.organizationId; }
  get code(): string { return this.props.code; }
  get name(): string { return this.props.name; }
  get category(): EmploymentCategory { return this.props.category; }
  get rulesConfig(): any { return this.props.rulesConfig; }
  get version(): number { return this.props.version; }
  get isActive(): boolean { return this.props.isActive; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get deletedAt(): Date | null { return this.props.deletedAt; }

  // Behaviors
  update(
    params: { name?: string; category?: EmploymentCategory; rulesConfig?: any; isActive?: boolean },
    now: Date = new Date()
  ): void {
    if (!this.props.isActive && params.isActive === undefined) {
      throw AppError.badRequest('Cannot update an inactive employment type');
    }

    let modified = false;

    if (params.name !== undefined) {
      this.props.name = params.name;
      modified = true;
    }
    if (params.category !== undefined) {
      this.props.category = params.category;
      modified = true;
    }
    if (params.rulesConfig !== undefined) {
      this.props.rulesConfig = params.rulesConfig;
      modified = true;
    }
    if (params.isActive !== undefined) {
      this.props.isActive = params.isActive;
      modified = true;
    }
    
    if (modified) {
      this.props.version += 1;
      this.props.updatedAt = now;
    }
  }

  archive(now: Date = new Date()): void {
    if (!this.props.isActive) {
      return;
    }
    
    this.props.isActive = false;
    this.props.deletedAt = now;
    this.props.updatedAt = now;
    this.props.version += 1;
  }

  toJSON(): EmploymentTypeProps {
    return { ...this.props };
  }
}
