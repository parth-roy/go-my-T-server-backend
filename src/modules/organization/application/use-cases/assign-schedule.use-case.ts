import { randomUUID } from 'crypto';
import { IScheduleAssignmentRepository, IWorkScheduleTemplateVersionRepository } from '../../domain/repositories/schedule.repository.interface';
import { ScheduleAssignmentEntity } from '../../domain/entities/schedule-assignment.entity';
import { AppError } from '@shared/errors/AppError';
import { AssignScheduleDto } from '../dtos/work-schedule.dto';
import { RequestContext } from '@shared/context/request-context';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { eventBus } from '@shared/eventbus';
import { EmploymentAssignmentStatus, TemplateVersionStatus } from '@prisma/client';

export class AssignScheduleUseCase {
  constructor(
    private readonly assignmentRepo: IScheduleAssignmentRepository,
    private readonly versionRepo: IWorkScheduleTemplateVersionRepository
  ) {}

  async execute(context: RequestContext, dto: AssignScheduleDto): Promise<void> {
    const caps = CapabilityResolver.resolve(context.platformIdentity.role as any);
    MembershipPolicy.assertCapability(caps, 'MANAGE_SCHEDULE_TEMPLATES');
    
    const organizationId = context.organization!.id;

    const version = await this.versionRepo.findById(dto.scheduleTemplateVersionId);
    if (!version || version.status !== TemplateVersionStatus.PUBLISHED) {
      throw AppError.badRequest('Only PUBLISHED schedule template versions can be assigned');
    }

    const now = new Date();
    const effectiveFrom = dto.effectiveFrom || now;

    // Fetch existing active overlapping assignments to terminate them
    const overlaps = await this.assignmentRepo.findOverlapping(organizationId, dto.targetType, dto.targetId, effectiveFrom, null);

    for (const overlap of overlaps) {
      overlap.terminate(effectiveFrom);
      await this.assignmentRepo.save(overlap);
      eventBus.emit('schedule.assignment.expired', {
        scheduleAssignmentId: overlap.id,
        targetType: overlap.targetType,
        targetId: overlap.targetId,
        organizationId,
        timestamp: now
      });
    }

    const newAssignmentId = randomUUID();
    const newAssignment = ScheduleAssignmentEntity.create({
      id: newAssignmentId,
      organizationId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      scheduleTemplateVersionId: dto.scheduleTemplateVersionId,
      reason: dto.reason,
      effectiveFrom,
      effectiveUntil: null,
      status: EmploymentAssignmentStatus.ACTIVE,
      version: 1,
      createdAt: now,
      updatedAt: now
    });

    await this.assignmentRepo.save(newAssignment);

    eventBus.emit('schedule.assignment.created', {
      scheduleAssignmentId: newAssignmentId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      organizationId,
      timestamp: now
    });

    // Notify runtime that resolution logic might have changed for downstream targets
    eventBus.emit('schedule.resolution.changed', {
      targetType: dto.targetType,
      targetId: dto.targetId,
      organizationId,
      newVersionId: dto.scheduleTemplateVersionId,
      timestamp: now
    });
  }
}
