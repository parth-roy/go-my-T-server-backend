import { randomUUID } from 'crypto';
import { IShiftGenerationJobRepository } from '../../domain/repositories/shift.repository.interface';
import { ShiftGenerationJobEntity } from '../../domain/entities/shift-generation-job.entity';
import { ShiftGenerationService } from '../services/shift-generation.service';
import { AppError } from '@shared/errors/AppError';
import { TriggerShiftGenerationDto } from '../dtos/shift.dto';
import { RequestContext } from '@shared/context/request-context';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { ShiftGenerationJobStatus } from '@prisma/client';

export class TriggerShiftGenerationUseCase {
  constructor(
    private readonly jobRepo: IShiftGenerationJobRepository,
    private readonly generationService: ShiftGenerationService
  ) {}

  async execute(context: RequestContext, dto: TriggerShiftGenerationDto): Promise<{ jobId: string }> {
    const caps = CapabilityResolver.resolve(context.platformIdentity.role as any);
    MembershipPolicy.assertCapability(caps, 'MANAGE_SCHEDULE_TEMPLATES');
    
    const organizationId = context.organization!.id;

    if (dto.windowStart > dto.windowEnd) {
      throw AppError.badRequest('Window start must be before window end');
    }

    const jobId = randomUUID();
    const job = ShiftGenerationJobEntity.create({
      id: jobId,
      organizationId,
      windowStart: dto.windowStart,
      windowEnd: dto.windowEnd,
      status: ShiftGenerationJobStatus.PENDING,
      trigger: dto.trigger,
      generatedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await this.jobRepo.save(job);

    // In a real application, we would publish a message to a BullMQ queue here.
    // Since this is the initial monolithic pass, we execute the orchestration directly.
    // A background process/worker would pick up `jobId` and call `ShiftGenerationService.executeJob`.
    
    // Fire and forget (poor man's background job for demonstration)
    setImmediate(() => {
      this.generationService.executeJob(organizationId, jobId).catch(e => console.error('Shift generation failed', e));
    });

    return { jobId };
  }
}
