import { IDesignationRepository } from '../../domain/repositories/designation.repository.interface';
import { AppError } from '@shared/errors/AppError';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { RequestContext } from '@shared/context/request-context';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { eventBus } from '@shared/eventbus';
import { DesignationStatus } from '../../domain/enums/designation-status.enum';

export class ArchiveDesignationUseCase {
  constructor(private readonly designationRepo: IDesignationRepository) {}

  async execute(context: RequestContext, designationId: string): Promise<void> {
    const caps = CapabilityResolver.resolve(context.platformIdentity.role as any);
    MembershipPolicy.assertCapability(caps, 'ARCHIVE_DESIGNATION');
    const organizationId = context.organization!.id;

    const designation = await this.designationRepo.findById(organizationId, designationId);
    if (!designation) {
      throw AppError.notFound('Designation not found');
    }

    if (designation.status === DesignationStatus.ARCHIVED) {
      return;
    }

    const now = new Date();
    designation.archive(now);

    await this.designationRepo.save(designation);

    eventBus.emit('designation.archived', {
      organizationId,
      designationId,
      timestamp: now,
    });
  }
}
