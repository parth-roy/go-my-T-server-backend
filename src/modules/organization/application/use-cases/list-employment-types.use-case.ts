import { IEmploymentTypeRepository } from '../../domain/repositories/employment-type.repository.interface';
import { EmploymentTypeResponseDto } from '../dtos/employment-type.dto';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { RequestContext } from '@shared/context/request-context';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';

export class ListEmploymentTypesUseCase {
  constructor(
    private readonly employmentTypeRepo: IEmploymentTypeRepository
  ) {}

  async execute(
    context: RequestContext, 
    options?: { cursor?: string; limit?: number; includeInactive?: boolean }
  ): Promise<EmploymentTypeResponseDto[]> {
    const caps = CapabilityResolver.resolve(context.platformIdentity.role as any);
    MembershipPolicy.assertCapability(caps, 'VIEW_EMPLOYMENT_TYPE');
    const organizationId = context.organization!.id;

    const employmentTypes = await this.employmentTypeRepo.list(organizationId, options);

    return employmentTypes.map(type => type.toJSON());
  }
}
