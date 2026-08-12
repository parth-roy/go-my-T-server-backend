import { randomUUID } from 'crypto';
import { IShiftOverrideRepository, IShiftInstanceRepository } from '../../domain/repositories/shift.repository.interface';
import { ShiftOverrideEntity } from '../../domain/entities/shift-override.entity';
import { AppError } from '@shared/errors/AppError';
import { ApplyShiftOverrideDto } from '../dtos/shift.dto';
import { RequestContext } from '@shared/context/request-context';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { ShiftOverrideStatus, ShiftLifecycleStatus } from '@prisma/client';
import { eventBus } from '@shared/eventbus';

export class ApplyShiftOverrideUseCase {
  constructor(
    private readonly overrideRepo: IShiftOverrideRepository,
    private readonly shiftRepo: IShiftInstanceRepository
  ) {}

  async execute(context: RequestContext, dto: ApplyShiftOverrideDto): Promise<{ overrideId: string }> {
    const caps = CapabilityResolver.resolve(context.platformIdentity.role as any);
    MembershipPolicy.assertCapability(caps, 'MANAGE_SCHEDULE_TEMPLATES');
    
    const organizationId = context.organization!.id;
    const requestedBy = context.membership!.id;

    const shift = await this.shiftRepo.findById(organizationId, dto.shiftId);
    if (!shift) {
      throw AppError.notFound('Shift not found');
    }

    const invalidStates: ShiftLifecycleStatus[] = [ShiftLifecycleStatus.CANCELLED, ShiftLifecycleStatus.EXPIRED, ShiftLifecycleStatus.COMPLETED];
    if (invalidStates.includes(shift.status)) {
      throw AppError.badRequest('Cannot override a shift that is cancelled, expired, or completed');
    }

    if (!dto.overrideStartTime && !dto.overrideEndTime) {
      throw AppError.badRequest('Must provide at least one override time');
    }

    const overrideId = randomUUID();
    const override = ShiftOverrideEntity.create({
      id: overrideId,
      shiftId: dto.shiftId,
      status: ShiftOverrideStatus.PENDING,
      overrideStartTime: dto.overrideStartTime,
      overrideEndTime: dto.overrideEndTime,
      reason: dto.reason,
      requestedBy,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await this.overrideRepo.save(override);

    eventBus.emit('shift.override.created', {
      overrideId,
      shiftId: dto.shiftId,
      organizationId,
      timestamp: new Date()
    });

    return { overrideId };
  }
}
