import { ScheduleTargetType, ScheduleAssignmentReason } from '@prisma/client';
import { WorkScheduleConfiguration } from '../../domain/value-objects/work-schedule-configuration.vo';

export interface CreateWorkScheduleTemplateDto {
  code: string;
  name: string;
  description?: string;
  initialConfiguration: WorkScheduleConfiguration;
}

export interface AddScheduleTemplateVersionDto {
  configuration: WorkScheduleConfiguration;
}

export interface AssignScheduleDto {
  targetType: ScheduleTargetType;
  targetId: string;
  scheduleTemplateVersionId: string;
  reason: ScheduleAssignmentReason;
  effectiveFrom?: Date;
}
