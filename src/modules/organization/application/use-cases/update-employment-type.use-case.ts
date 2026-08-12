import { IEmploymentTypeRepository } from '../../domain/repositories/employment-type.repository.interface';
import { AppError } from '@shared/errors/AppError';
import { UpdateEmploymentTypeDto, EmploymentTypeResponseDto } from '../dtos/employment-type.dto';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { RequestContext } from '@shared/context/request-context';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { eventBus } from '@shared/eventbus';

export class UpdateEmploymentTypeUseCase {
  constructor(
    private readonly employmentTypeRepo: IEmploymentTypeRepository
  ) {}

  async execute(context: RequestContext, id: string, dto: UpdateEmploymentTypeDto): Promise<EmploymentTypeResponseDto> {
    const caps = CapabilityResolver.resolve(context.platformIdentity.role as any);
    MembershipPolicy.assertCapability(caps, 'UPDATE_EMPLOYMENT_TYPE');
    const organizationId = context.organization!.id;

    const employmentType = await this.employmentTypeRepo.findById(organizationId, id);
    if (!employmentType) {
      throw AppError.notFound('Employment type not found');
    }

    if (dto.name) {
      const existingName = await this.employmentTypeRepo.findByName(organizationId, dto.name);
      if (existingName && existingName.id !== id) {
        throw AppError.badRequest('Employment type name already exists in this organization');
      }
    }

    const now = new Date();
    employmentType.update(dto, now);

    await this.employmentTypeRepo.save(employmentType);

    eventBus.emit('employment_type.updated', {
      organizationId,
      employmentTypeId: id,
      timestamp: now,
    });

    return {
      ...employmentType.toJSON(),
    };
  }
}
