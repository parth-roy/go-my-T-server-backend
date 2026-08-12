import { IDesignationRepository } from '../../domain/repositories/designation.repository.interface';
import { AppError } from '@shared/errors/AppError';
import { UpdateDesignationDto, DesignationResponseDto } from '../dtos/designation.dto';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { RequestContext } from '@shared/context/request-context';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';
import { eventBus } from '@shared/eventbus';

export class UpdateDesignationUseCase {
  constructor(
    private readonly designationRepo: IDesignationRepository
  ) {}

  async execute(
    context: RequestContext,
    designationId: string,
    dto: UpdateDesignationDto
  ): Promise<DesignationResponseDto> {
    const caps = CapabilityResolver.resolve(context.platformIdentity.role as any);
    MembershipPolicy.assertCapability(caps, 'UPDATE_DESIGNATION');
    const organizationId = context.organization!.id;

    const designation = await this.designationRepo.findById(organizationId, designationId);
    if (!designation) {
      throw AppError.notFound('Designation not found');
    }

    if (dto.name && dto.name !== designation.name) {
      const existingName = await this.designationRepo.findByName(organizationId, dto.name);
      if (existingName) {
        throw AppError.badRequest('Designation name already exists in this organization');
      }
    }

    const now = new Date();
    designation.update({
      name: dto.name,
      description: dto.description,
      level: dto.level,
      status: dto.status
    }, now);

    await this.designationRepo.save(designation);

    eventBus.emit('designation.updated', {
      organizationId,
      designationId,
      timestamp: now,
    });

    return {
      ...designation.toJSON(),
    };
  }
}
