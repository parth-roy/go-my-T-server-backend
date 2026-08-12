export interface WorkScheduleTemplateProps {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class WorkScheduleTemplateEntity {
  private props: WorkScheduleTemplateProps;

  private constructor(props: WorkScheduleTemplateProps) {
    this.props = props;
  }

  static create(props: WorkScheduleTemplateProps): WorkScheduleTemplateEntity {
    return new WorkScheduleTemplateEntity(props);
  }

  static reconstitute(props: WorkScheduleTemplateProps): WorkScheduleTemplateEntity {
    return new WorkScheduleTemplateEntity(props);
  }

  get id(): string { return this.props.id; }
  get organizationId(): string { return this.props.organizationId; }
  get isActive(): boolean { return this.props.isActive; }

  public deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  public activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  toJSON() {
    return { ...this.props };
  }
}
