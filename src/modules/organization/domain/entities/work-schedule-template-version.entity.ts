import { TemplateVersionStatus } from '@prisma/client';
import { WorkScheduleConfiguration } from '../value-objects/work-schedule-configuration.vo';
import { AppError } from '@shared/errors/AppError';

export interface WorkScheduleTemplateVersionProps {
  id: string;
  templateId: string;
  versionNumber: number;
  status: TemplateVersionStatus;
  configurationData: WorkScheduleConfiguration;
  createdAt: Date;
  updatedAt: Date;
}

export class WorkScheduleTemplateVersionEntity {
  private props: WorkScheduleTemplateVersionProps;

  private constructor(props: WorkScheduleTemplateVersionProps) {
    this.props = props;
  }

  static create(props: WorkScheduleTemplateVersionProps): WorkScheduleTemplateVersionEntity {
    return new WorkScheduleTemplateVersionEntity(props);
  }

  static reconstitute(props: WorkScheduleTemplateVersionProps): WorkScheduleTemplateVersionEntity {
    return new WorkScheduleTemplateVersionEntity(props);
  }

  get id(): string { return this.props.id; }
  get templateId(): string { return this.props.templateId; }
  get versionNumber(): number { return this.props.versionNumber; }
  get status(): TemplateVersionStatus { return this.props.status; }
  get configuration(): WorkScheduleConfiguration { return this.props.configurationData; }

  public publish(): void {
    if (this.props.status !== TemplateVersionStatus.VALIDATED) {
      throw AppError.badRequest('Only VALIDATED templates can be published');
    }
    this.props.status = TemplateVersionStatus.PUBLISHED;
    this.props.updatedAt = new Date();
  }

  public validate(): void {
    if (this.props.status !== TemplateVersionStatus.DRAFT) {
      throw AppError.badRequest('Only DRAFT templates can be validated');
    }
    // Validation logic (e.g. cross-midnight overlaps) will be injected or called from UseCase
    // For the entity boundary, we just assert status transition.
    this.props.status = TemplateVersionStatus.VALIDATED;
    this.props.updatedAt = new Date();
  }

  public archive(): void {
    this.props.status = TemplateVersionStatus.ARCHIVED;
    this.props.updatedAt = new Date();
  }

  toJSON() {
    return { ...this.props };
  }
}
