import { PrismaClient, ScheduleTargetType, EmploymentAssignmentStatus, TemplateVersionStatus } from '@prisma/client';
import { IWorkScheduleTemplateRepository, IWorkScheduleTemplateVersionRepository, IScheduleAssignmentRepository } from '../../domain/repositories/schedule.repository.interface';
import { WorkScheduleTemplateEntity, WorkScheduleTemplateProps } from '../../domain/entities/work-schedule-template.entity';
import { WorkScheduleTemplateVersionEntity, WorkScheduleTemplateVersionProps } from '../../domain/entities/work-schedule-template-version.entity';
import { ScheduleAssignmentEntity, ScheduleAssignmentProps } from '../../domain/entities/schedule-assignment.entity';
import { WorkScheduleConfiguration } from '../../domain/value-objects/work-schedule-configuration.vo';

export class PrismaWorkScheduleTemplateRepository implements IWorkScheduleTemplateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toDomain(record: any): WorkScheduleTemplateEntity {
    const props: WorkScheduleTemplateProps = {
      id: record.id,
      organizationId: record.organizationId,
      code: record.code,
      name: record.name,
      description: record.description,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt
    };
    return WorkScheduleTemplateEntity.reconstitute(props);
  }

  async findById(organizationId: string, id: string): Promise<WorkScheduleTemplateEntity | null> {
    const record = await this.prisma.workScheduleTemplate.findFirst({
      where: { id, organizationId, deletedAt: null }
    });
    return record ? this.toDomain(record) : null;
  }

  async findByCode(organizationId: string, code: string): Promise<WorkScheduleTemplateEntity | null> {
    const record = await this.prisma.workScheduleTemplate.findFirst({
      where: { code, organizationId, deletedAt: null }
    });
    return record ? this.toDomain(record) : null;
  }

  async save(template: WorkScheduleTemplateEntity): Promise<void> {
    const data = template.toJSON();
    await this.prisma.workScheduleTemplate.upsert({
      where: { id: data.id },
      create: data,
      update: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        updatedAt: data.updatedAt,
        deletedAt: data.deletedAt
      }
    });
  }

  async list(organizationId: string): Promise<WorkScheduleTemplateEntity[]> {
    const records = await this.prisma.workScheduleTemplate.findMany({
      where: { organizationId, deletedAt: null }
    });
    return records.map(r => this.toDomain(r));
  }
}

export class PrismaWorkScheduleTemplateVersionRepository implements IWorkScheduleTemplateVersionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toDomain(record: any): WorkScheduleTemplateVersionEntity {
    const props: WorkScheduleTemplateVersionProps = {
      id: record.id,
      templateId: record.templateId,
      versionNumber: record.versionNumber,
      status: record.status as TemplateVersionStatus,
      configurationData: record.configurationData as any as WorkScheduleConfiguration,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
    return WorkScheduleTemplateVersionEntity.reconstitute(props);
  }

  async findById(id: string): Promise<WorkScheduleTemplateVersionEntity | null> {
    const record = await this.prisma.workScheduleTemplateVersion.findUnique({
      where: { id }
    });
    return record ? this.toDomain(record) : null;
  }

  async findActiveVersion(templateId: string): Promise<WorkScheduleTemplateVersionEntity | null> {
    const record = await this.prisma.workScheduleTemplateVersion.findFirst({
      where: { templateId, status: TemplateVersionStatus.PUBLISHED },
      orderBy: { versionNumber: 'desc' }
    });
    return record ? this.toDomain(record) : null;
  }

  async save(version: WorkScheduleTemplateVersionEntity): Promise<void> {
    const data = version.toJSON();
    await this.prisma.workScheduleTemplateVersion.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        templateId: data.templateId,
        versionNumber: data.versionNumber,
        status: data.status,
        configurationData: data.configurationData as any,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      },
      update: {
        status: data.status,
        configurationData: data.configurationData as any,
        updatedAt: data.updatedAt
      }
    });
  }

  async getNextVersionNumber(templateId: string): Promise<number> {
    const latest = await this.prisma.workScheduleTemplateVersion.findFirst({
      where: { templateId },
      orderBy: { versionNumber: 'desc' }
    });
    return latest ? latest.versionNumber + 1 : 1;
  }
}

export class PrismaScheduleAssignmentRepository implements IScheduleAssignmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toDomain(record: any): ScheduleAssignmentEntity {
    const props: ScheduleAssignmentProps = {
      id: record.id,
      organizationId: record.organizationId,
      targetType: record.targetType as ScheduleTargetType,
      targetId: record.targetId,
      scheduleTemplateVersionId: record.scheduleTemplateVersionId,
      reason: record.reason as any,
      effectiveFrom: record.effectiveFrom,
      effectiveUntil: record.effectiveUntil,
      status: record.status as EmploymentAssignmentStatus,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
    return ScheduleAssignmentEntity.reconstitute(props);
  }

  async findById(id: string): Promise<ScheduleAssignmentEntity | null> {
    const record = await this.prisma.scheduleAssignment.findUnique({
      where: { id }
    });
    return record ? this.toDomain(record) : null;
  }

  async findActiveByTarget(organizationId: string, targetType: ScheduleTargetType, targetId: string, date: Date): Promise<string | null> {
    const record = await this.prisma.scheduleAssignment.findFirst({
      where: {
        organizationId,
        targetType,
        targetId,
        status: EmploymentAssignmentStatus.ACTIVE,
        effectiveFrom: { lte: date },
        OR: [
          { effectiveUntil: null },
          { effectiveUntil: { gt: date } }
        ]
      },
      orderBy: { effectiveFrom: 'desc' }
    });
    return record ? record.scheduleTemplateVersionId : null;
  }

  async findOverlapping(organizationId: string, targetType: ScheduleTargetType, targetId: string, from: Date, to: Date | null): Promise<ScheduleAssignmentEntity[]> {
    const records = await this.prisma.scheduleAssignment.findMany({
      where: {
        organizationId,
        targetType,
        targetId,
        status: EmploymentAssignmentStatus.ACTIVE,
        OR: [
          { effectiveUntil: null },
          { effectiveUntil: { gt: from } }
        ]
        // This is a simplified overlap check. If `to` is provided, we'd also check `effectiveFrom < to`
      }
    });

    if (to) {
      return records.filter(r => r.effectiveFrom < to).map(r => this.toDomain(r));
    }

    return records.map(r => this.toDomain(r));
  }

  async save(assignment: ScheduleAssignmentEntity): Promise<void> {
    const data = assignment.toJSON();
    await this.prisma.scheduleAssignment.upsert({
      where: { id: data.id },
      create: data,
      update: {
        effectiveFrom: data.effectiveFrom,
        effectiveUntil: data.effectiveUntil,
        status: data.status,
        version: data.version,
        updatedAt: data.updatedAt
      }
    });
  }

  async saveMany(assignments: ScheduleAssignmentEntity[]): Promise<void> {
    // Basic iterative save for scope. In production, this would use a Prisma transaction.
    for (const a of assignments) {
      await this.save(a);
    }
  }
}
