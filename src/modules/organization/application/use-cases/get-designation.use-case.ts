import { IDesignationRepository } from '../../domain/repositories/designation.repository.interface';
import { AppError } from '@shared/errors/AppError';
import { DesignationResponseDto } from '../dtos/designation.dto';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { RequestContext } from '@shared/context/request-context';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';

export class GetDesignationUseCase {
  constructor(private readonly designationRepo: IDesignationRepository) {}

  async execute(context: RequestContext, designationId: string): Promise<DesignationResponseDto> {
    const caps = CapabilityResolver.resolve(context.platformIdentity.role as any);
    MembershipPolicy.assertCapability(caps, 'VIEW_DESIGNATION');
    const organizationId = context.organization!.id;

    const designation = await this.designationRepo.findById(organizationId, designationId);
    if (!designation) {
      throw AppError.notFound('Designation not found');
    }

    return {
      ...designation.toJSON(),
    };
  }
}
