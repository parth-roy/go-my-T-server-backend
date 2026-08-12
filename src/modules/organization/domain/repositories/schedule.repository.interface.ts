import { ScheduleTargetType } from '@prisma/client';
import { WorkScheduleTemplateEntity } from '../entities/work-schedule-template.entity';
import { WorkScheduleTemplateVersionEntity } from '../entities/work-schedule-template-version.entity';
import { ScheduleAssignmentEntity } from '../entities/schedule-assignment.entity';

export interface IWorkScheduleTemplateRepository {
  findById(organizationId: string, id: string): Promise<WorkScheduleTemplateEntity | null>;
  findByCode(organizationId: string, code: string): Promise<WorkScheduleTemplateEntity | null>;
  save(template: WorkScheduleTemplateEntity): Promise<void>;
  list(organizationId: string): Promise<WorkScheduleTemplateEntity[]>;
}

export interface IWorkScheduleTemplateVersionRepository {
  findById(id: string): Promise<WorkScheduleTemplateVersionEntity | null>;
  findActiveVersion(templateId: string): Promise<WorkScheduleTemplateVersionEntity | null>;
  save(version: WorkScheduleTemplateVersionEntity): Promise<void>;
  getNextVersionNumber(templateId: string): Promise<number>;
}

export interface IScheduleAssignmentRepository {
  findById(id: string): Promise<ScheduleAssignmentEntity | null>;
  findActiveByTarget(organizationId: string, targetType: ScheduleTargetType, targetId: string, date: Date): Promise<string | null>;
  findOverlapping(organizationId: string, targetType: ScheduleTargetType, targetId: string, from: Date, to: Date | null): Promise<ScheduleAssignmentEntity[]>;
  save(assignment: ScheduleAssignmentEntity): Promise<void>;
  saveMany(assignments: ScheduleAssignmentEntity[]): Promise<void>;
}
