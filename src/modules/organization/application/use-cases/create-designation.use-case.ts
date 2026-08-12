import { randomUUID } from 'crypto';
import { IDesignationRepository } from '../../domain/repositories/designation.repository.interface';
import { DesignationEntity, DesignationProps } from '../../domain/entities/designation.entity';
import { DesignationStatus } from '../../domain/enums/designation-status.enum';
import { AppError } from '@shared/errors/AppError';
import { CreateDesignationDto, DesignationResponseDto } from '../dtos/designation.dto';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { RequestContext } from '@shared/context/request-context';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { DesignationCodeGeneratorDomainService } from '../../domain/services/designation-code-generator.domain-service';
import { eventBus } from '@shared/eventbus';

export class CreateDesignationUseCase {
  constructor(
    private readonly designationRepo: IDesignationRepository,
    private readonly codeGenerator: DesignationCodeGeneratorDomainService
  ) {}

  async execute(context: RequestContext, dto: CreateDesignationDto): Promise<DesignationResponseDto> {
    const caps = CapabilityResolver.resolve(context.platformIdentity.role as any);
    MembershipPolicy.assertCapability(caps, 'CREATE_DESIGNATION');
    const organizationId = context.organization!.id;

    // Uniqueness Checks
    const existingName = await this.designationRepo.findByName(organizationId, dto.name);
    if (existingName) {
      throw AppError.badRequest('Designation name already exists in this organization');
    }

    const code = await this.codeGenerator.generateCode(organizationId, dto.code);

    const designationId = randomUUID();
    const now = new Date();

    const props: DesignationProps = {
      id: designationId,
      organizationId,
      name: dto.name,
      code,
      description: dto.description || null,
      level: dto.level || null,
      status: DesignationStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const designation = DesignationEntity.create(props);

    // Save and Emit
    await this.designationRepo.save(designation);

    eventBus.emit('designation.created', {
      organizationId,
      designationId,
      timestamp: now,
    });

    return {
      ...designation.toJSON(),
    };
  }
}
