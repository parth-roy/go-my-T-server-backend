import { IEmploymentTypeRepository } from '../../domain/repositories/employment-type.repository.interface';
import { AppError } from '@shared/errors/AppError';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { RequestContext } from '@shared/context/request-context';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { eventBus } from '@shared/eventbus';

export class ArchiveEmploymentTypeUseCase {
  constructor(
    private readonly employmentTypeRepo: IEmploymentTypeRepository
  ) {}

  async execute(context: RequestContext, id: string): Promise<void> {
    const caps = CapabilityResolver.resolve(context.platformIdentity.role as any);
    MembershipPolicy.assertCapability(caps, 'DELETE_EMPLOYMENT_TYPE');
    const organizationId = context.organization!.id;

    const employmentType = await this.employmentTypeRepo.findById(organizationId, id);
    if (!employmentType) {
      throw AppError.notFound('Employment type not found');
    }

    const now = new Date();
    employmentType.archive(now);

    await this.employmentTypeRepo.save(employmentType);

    eventBus.emit('employment_type.archived', {
      organizationId,
      employmentTypeId: id,
      timestamp: now,
    });
  }
}
