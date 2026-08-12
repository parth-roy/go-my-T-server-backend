import { IWorkScheduleTemplateVersionRepository, IWorkScheduleTemplateRepository } from '../../domain/repositories/schedule.repository.interface';
import { AppError } from '@shared/errors/AppError';
import { RequestContext } from '@shared/context/request-context';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { MembershipPolicy } from '../../domain/policies/membership.policy';

export class PublishScheduleTemplateVersionUseCase {
  constructor(
    private readonly versionRepo: IWorkScheduleTemplateVersionRepository,
    private readonly templateRepo: IWorkScheduleTemplateRepository
  ) {}

  async execute(context: RequestContext, templateId: string, versionId: string): Promise<void> {
    const caps = CapabilityResolver.resolve(context.platformIdentity.role as any);
    MembershipPolicy.assertCapability(caps, 'MANAGE_SCHEDULE_TEMPLATES');
    
    const organizationId = context.organization!.id;

    const template = await this.templateRepo.findById(organizationId, templateId);
    if (!template) {
      throw AppError.notFound('Work Schedule Template not found');
    }

    const version = await this.versionRepo.findById(versionId);
    if (!version || version.templateId !== templateId) {
      throw AppError.notFound('Version not found for this template');
    }

    version.publish();
    await this.versionRepo.save(version);
  }
}
