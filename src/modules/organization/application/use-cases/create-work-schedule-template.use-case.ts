import { randomUUID } from 'crypto';
import { IWorkScheduleTemplateRepository, IWorkScheduleTemplateVersionRepository } from '../../domain/repositories/schedule.repository.interface';
import { WorkScheduleTemplateEntity } from '../../domain/entities/work-schedule-template.entity';
import { WorkScheduleTemplateVersionEntity } from '../../domain/entities/work-schedule-template-version.entity';
import { WorkScheduleConfigurationVO } from '../../domain/value-objects/work-schedule-configuration.vo';
import { ScheduleConfigurationValidator } from '../../domain/policies/schedule-configuration.validator';
import { AppError } from '@shared/errors/AppError';
import { CreateWorkScheduleTemplateDto } from '../dtos/work-schedule.dto';
import { RequestContext } from '@shared/context/request-context';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { eventBus } from '@shared/eventbus';
import { TemplateVersionStatus } from '@prisma/client';

export class CreateWorkScheduleTemplateUseCase {
  constructor(
    private readonly templateRepo: IWorkScheduleTemplateRepository,
    private readonly versionRepo: IWorkScheduleTemplateVersionRepository
  ) {}

  async execute(context: RequestContext, dto: CreateWorkScheduleTemplateDto): Promise<{ templateId: string, versionId: string }> {
    const caps = CapabilityResolver.resolve(context.platformIdentity.role as any);
    MembershipPolicy.assertCapability(caps, 'MANAGE_SCHEDULE_TEMPLATES');
    
    const organizationId = context.organization!.id;

    const existing = await this.templateRepo.findByCode(organizationId, dto.code);
    if (existing) {
      throw AppError.badRequest(`Template with code ${dto.code} already exists.`);
    }

    // Validate VO
    const configVO = new WorkScheduleConfigurationVO(dto.initialConfiguration);
    ScheduleConfigurationValidator.validate(configVO.value);

    const now = new Date();
    const templateId = randomUUID();

    const template = WorkScheduleTemplateEntity.create({
      id: templateId,
      organizationId,
      code: dto.code,
      name: dto.name,
      description: dto.description || null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    });

    const versionId = randomUUID();
    const version = WorkScheduleTemplateVersionEntity.create({
      id: versionId,
      templateId: templateId,
      versionNumber: 1,
      status: TemplateVersionStatus.DRAFT,
      configurationData: configVO.value,
      createdAt: now,
      updatedAt: now
    });

    // Run business validation for Draft -> Validated
    version.validate();

    await this.templateRepo.save(template);
    await this.versionRepo.save(version);

    eventBus.emit('schedule.template.created', {
      templateId,
      organizationId,
      timestamp: now
    });

    eventBus.emit('schedule.template.version.created', {
      templateVersionId: versionId,
      templateId,
      organizationId,
      versionNumber: 1,
      timestamp: now
    });

    return { templateId, versionId };
  }
}
