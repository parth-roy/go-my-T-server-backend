import { PrismaClient, ShiftLifecycleStatus, ShiftGenerationJobStatus, ShiftGenerationTrigger, ShiftOverrideStatus } from '@prisma/client';
import { IShiftInstanceRepository, IShiftGenerationJobRepository, IShiftOverrideRepository } from '../../domain/repositories/shift.repository.interface';
import { ShiftInstanceEntity, ShiftInstanceProps } from '../../domain/entities/shift-instance.entity';
import { ShiftGenerationJobEntity, ShiftGenerationJobProps } from '../../domain/entities/shift-generation-job.entity';
import { ShiftOverrideEntity, ShiftOverrideProps } from '../../domain/entities/shift-override.entity';
import { AssignmentSnapshotVO, ScheduleSnapshotVO } from '../../domain/value-objects/shift-snapshots.vo';

export class PrismaShiftInstanceRepository implements IShiftInstanceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toDomain(record: any): ShiftInstanceEntity {
    const props: ShiftInstanceProps = {
      id: record.id,
      organizationId: record.organizationId,
      membershipId: record.membershipId,
      assignmentId: record.assignmentId,
      date: record.date,
      status: record.status as ShiftLifecycleStatus,
      startTime: record.startTime,
      endTime: record.endTime,
      expectedDuration: record.expectedDuration,
      scheduleSnapshot: new ScheduleSnapshotVO(record.scheduleSnapshot as any),
      assignmentSnapshot: new AssignmentSnapshotVO(record.assignmentSnapshot as any),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
    return ShiftInstanceEntity.reconstitute(props);
  }

  async findById(organizationId: string, id: string): Promise<ShiftInstanceEntity | null> {
    const record = await this.prisma.shiftInstance.findUnique({
      where: { id }
    });
    if (!record || record.organizationId !== organizationId) return null;
    return this.toDomain(record);
  }

  async findByMembershipAndDate(organizationId: string, membershipId: string, date: Date): Promise<ShiftInstanceEntity | null> {
    const record = await this.prisma.shiftInstance.findUnique({
      where: {
        membershipId_date: {
          membershipId,
          date
        }
      }
    });
    if (!record || record.organizationId !== organizationId) return null;
    return this.toDomain(record);
  }

  async save(shift: ShiftInstanceEntity): Promise<void> {
    const data = shift.toJSON();
    await this.prisma.shiftInstance.upsert({
      where: { id: data.id },
      create: {
        ...data,
        scheduleSnapshot: data.scheduleSnapshot as any,
        assignmentSnapshot: data.assignmentSnapshot as any
      },
      update: {
        status: data.status,
        startTime: data.startTime,
        endTime: data.endTime,
        expectedDuration: data.expectedDuration,
        scheduleSnapshot: data.scheduleSnapshot as any,
        assignmentSnapshot: data.assignmentSnapshot as any,
        updatedAt: data.updatedAt
      }
    });
  }

  async saveMany(shifts: ShiftInstanceEntity[]): Promise<void> {
    if (shifts.length === 0) return;
    
    // Prisma createMany currently does not support onConflict (except for skipDuplicates).
    // In a pure production scenario, this might be a raw SQL INSERT ... ON CONFLICT DO UPDATE.
    // For now, we will use skipDuplicates to fulfill idempotent generation.
    const records = shifts.map(s => {
      const data = s.toJSON();
      return {
        ...data,
        scheduleSnapshot: data.scheduleSnapshot as any,
        assignmentSnapshot: data.assignmentSnapshot as any
      };
    });

    await this.prisma.shiftInstance.createMany({
      data: records,
      skipDuplicates: true
    });
  }
}

export class PrismaShiftGenerationJobRepository implements IShiftGenerationJobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toDomain(record: any): ShiftGenerationJobEntity {
    const props: ShiftGenerationJobProps = {
      id: record.id,
      organizationId: record.organizationId,
      windowStart: record.windowStart,
      windowEnd: record.windowEnd,
      status: record.status as ShiftGenerationJobStatus,
      generatedCount: record.generatedCount,
      skippedCount: record.skippedCount,
      failedCount: record.failedCount,
      startedAt: record.startedAt,
      completedAt: record.completedAt,
      trigger: record.trigger as ShiftGenerationTrigger,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
    return ShiftGenerationJobEntity.reconstitute(props);
  }

  async findById(organizationId: string, id: string): Promise<ShiftGenerationJobEntity | null> {
    const record = await this.prisma.shiftGenerationJob.findUnique({
      where: { id }
    });
    if (!record || record.organizationId !== organizationId) return null;
    return this.toDomain(record);
  }

  async save(job: ShiftGenerationJobEntity): Promise<void> {
    const data = job.toJSON();
    await this.prisma.shiftGenerationJob.upsert({
      where: { id: data.id },
      create: data,
      update: data
    });
  }
}

export class PrismaShiftOverrideRepository implements IShiftOverrideRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toDomain(record: any): ShiftOverrideEntity {
    const props: ShiftOverrideProps = {
      id: record.id,
      shiftId: record.shiftId,
      status: record.status as ShiftOverrideStatus,
      overrideStartTime: record.overrideStartTime || undefined,
      overrideEndTime: record.overrideEndTime || undefined,
      reason: record.reason,
      requestedBy: record.requestedBy,
      approvedBy: record.approvedBy || undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
    return ShiftOverrideEntity.reconstitute(props);
  }

  async findById(id: string): Promise<ShiftOverrideEntity | null> {
    const record = await this.prisma.shiftOverride.findUnique({
      where: { id }
    });
    return record ? this.toDomain(record) : null;
  }

  async save(override: ShiftOverrideEntity): Promise<void> {
    const data = override.toJSON();
    await this.prisma.shiftOverride.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        shiftId: data.shiftId,
        status: data.status,
        overrideStartTime: data.overrideStartTime,
        overrideEndTime: data.overrideEndTime,
        reason: data.reason,
        requestedBy: data.requestedBy,
        approvedBy: data.approvedBy,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      },
      update: {
        status: data.status,
        overrideStartTime: data.overrideStartTime,
        overrideEndTime: data.overrideEndTime,
        reason: data.reason,
        requestedBy: data.requestedBy,
        approvedBy: data.approvedBy,
        updatedAt: data.updatedAt
      }
    });
  }
}
