import { randomUUID } from 'crypto';
import { IEmploymentTypeRepository } from '../../domain/repositories/employment-type.repository.interface';
import { EmploymentTypeEntity, EmploymentTypeProps } from '../../domain/entities/employment-type.entity';
import { AppError } from '@shared/errors/AppError';
import { CreateEmploymentTypeDto, EmploymentTypeResponseDto } from '../dtos/employment-type.dto';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { RequestContext } from '@shared/context/request-context';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { eventBus } from '@shared/eventbus';

export class CreateEmploymentTypeUseCase {
  constructor(
    private readonly employmentTypeRepo: IEmploymentTypeRepository
  ) {}

  async execute(context: RequestContext, dto: CreateEmploymentTypeDto): Promise<EmploymentTypeResponseDto> {
    const caps = CapabilityResolver.resolve(context.platformIdentity.role as any);
    MembershipPolicy.assertCapability(caps, 'CREATE_EMPLOYMENT_TYPE');
    const organizationId = context.organization!.id;

    // Uniqueness Checks
    const existingCode = await this.employmentTypeRepo.findByCode(organizationId, dto.code);
    if (existingCode) {
      throw AppError.badRequest('Employment type code already exists in this organization');
    }

    const existingName = await this.employmentTypeRepo.findByName(organizationId, dto.name);
    if (existingName) {
      throw AppError.badRequest('Employment type name already exists in this organization');
    }

    const employmentTypeId = randomUUID();
    const now = new Date();

    const props: EmploymentTypeProps = {
      id: employmentTypeId,
      organizationId,
      code: dto.code,
      name: dto.name,
      category: dto.category,
      rulesConfig: dto.rulesConfig || {},
      version: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const employmentType = EmploymentTypeEntity.create(props);

    // Save and Emit
    await this.employmentTypeRepo.save(employmentType);

    eventBus.emit('employment_type.created', {
      organizationId,
      employmentTypeId,
      category: dto.category,
      timestamp: now,
    });

    return {
      ...employmentType.toJSON(),
    };
  }
}
