import { ScheduleResolutionDomainService, ResolvedSchedule } from '../../domain/services/schedule-resolution.domain-service';
import { RequestContext } from '@shared/context/request-context';
import { AppError } from '@shared/errors/AppError';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { MembershipPolicy } from '../../domain/policies/membership.policy';

export class ResolveScheduleUseCase {
  constructor(
    private readonly resolutionService: ScheduleResolutionDomainService
  ) {}

  async execute(context: RequestContext, assignmentId: string, date: Date = new Date()): Promise<ResolvedSchedule> {
    const caps = CapabilityResolver.resolve(context.platformIdentity.role as any);
    MembershipPolicy.assertCapability(caps, 'VIEW_EMPLOYMENT_HISTORY');
    
    const organizationId = context.organization!.id;

    const resolved = await this.resolutionService.resolveForAssignment(organizationId, assignmentId, date);

    if (!resolved) {
      throw AppError.notFound('No active schedule could be resolved for this assignment.');
    }

    return resolved;
  }
}
