import { IShiftGenerationJobRepository, IShiftInstanceRepository } from '../../domain/repositories/shift.repository.interface';
import { IEmploymentAssignmentRepository } from '../../domain/repositories/employment-assignment.repository.interface';
import { ScheduleResolutionDomainService } from '../../domain/services/schedule-resolution.domain-service';
import { ShiftGenerationJobEntity } from '../../domain/entities/shift-generation-job.entity';
import { ShiftGenerationPolicy } from '../../domain/policies/shift-generation.policy';
import { ShiftInstanceEntity } from '../../domain/entities/shift-instance.entity';
import { eventBus } from '@shared/eventbus';

export class ShiftGenerationService {
  constructor(
    private readonly jobRepo: IShiftGenerationJobRepository,
    private readonly shiftRepo: IShiftInstanceRepository,
    private readonly assignmentRepo: IEmploymentAssignmentRepository,
    private readonly resolutionService: ScheduleResolutionDomainService
  ) {}

  public async executeJob(organizationId: string, jobId: string): Promise<void> {
    const job = await this.jobRepo.findById(organizationId, jobId);
    if (!job) throw new Error('Job not found');

    job.markProcessing();
    await this.jobRepo.save(job);

    try {
      // Find all active assignments for this organization
      const assignments = await this.assignmentRepo.findByOrganizationId(organizationId);

      let totalGenerated = 0;
      let totalSkipped = 0;

      for (const assignment of assignments) {
        let currentGenerated = 0;
        let currentSkipped = 0;
        
        // Loop through each date in the window
        for (let d = new Date(job.windowStart); d <= job.windowEnd; d.setDate(d.getDate() + 1)) {
          const currentDate = new Date(d);
          
          // Check if shift already exists
          const existing = await this.shiftRepo.findByMembershipAndDate(organizationId, assignment.membershipId, currentDate);
          
          if (existing) {
            // Check if we should regenerate
            if (ShiftGenerationPolicy.canRegenerate(existing.status)) {
              // Delete or overwrite. For this iteration, we treat it as skip to protect idempotency unless forced.
              currentSkipped++;
              continue;
            } else {
              currentSkipped++;
              continue;
            }
          }

          // Resolve schedule for this specific date
          const resolved = await this.resolutionService.resolveForAssignment(organizationId, assignment.id, currentDate);
          if (!resolved) {
            currentSkipped++;
            continue;
          }

          const shiftProps = ShiftGenerationPolicy.generate(currentDate, resolved, assignment, organizationId);
          if (shiftProps) {
            const shift = ShiftInstanceEntity.create(shiftProps);
            await this.shiftRepo.save(shift);

            eventBus.emit('shift.generated', {
              shiftId: shift.id,
              organizationId,
              membershipId: assignment.membershipId,
              timestamp: new Date()
            });
            currentGenerated++;
          } else {
            currentSkipped++;
          }
        }
        
        totalGenerated += currentGenerated;
        totalSkipped += currentSkipped;
      }

      job.recordSuccess(totalGenerated, totalSkipped);
      job.markCompleted();
      await this.jobRepo.save(job);

    } catch (error) {
      job.markFailed(1);
      await this.jobRepo.save(job);
      throw error;
    }
  }
}
