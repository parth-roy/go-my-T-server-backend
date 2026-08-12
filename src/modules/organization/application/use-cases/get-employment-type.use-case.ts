import { IEmploymentTypeRepository } from '../../domain/repositories/employment-type.repository.interface';
import { AppError } from '@shared/errors/AppError';
import { EmploymentTypeResponseDto } from '../dtos/employment-type.dto';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { RequestContext } from '@shared/context/request-context';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';

export class GetEmploymentTypeUseCase {
  constructor(
    private readonly employmentTypeRepo: IEmploymentTypeRepository
  ) {}

  async execute(context: RequestContext, id: string): Promise<EmploymentTypeResponseDto> {
    const caps = CapabilityResolver.resolve(context.platformIdentity.role as any);
    MembershipPolicy.assertCapability(caps, 'VIEW_EMPLOYMENT_TYPE');
    const organizationId = context.organization!.id;

    const employmentType = await this.employmentTypeRepo.findById(organizationId, id);
    if (!employmentType) {
      throw AppError.notFound('Employment type not found');
    }

    return {
      ...employmentType.toJSON(),
    };
  }
}
