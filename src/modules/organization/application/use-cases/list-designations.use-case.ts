import { IDesignationRepository } from '../../domain/repositories/designation.repository.interface';
import { DesignationResponseDto } from '../dtos/designation.dto';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { RequestContext } from '@shared/context/request-context';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';

export class ListDesignationsUseCase {
  constructor(private readonly designationRepo: IDesignationRepository) {}

  async execute(
    context: RequestContext,
    params: {
      cursor?: string;
      limit?: number;
      includeArchived?: boolean;
    }
  ): Promise<{ data: DesignationResponseDto[]; nextCursor?: string }> {
    const organizationId = context.organization!.id;
    const caps = CapabilityResolver.resolve(context.platformIdentity.role as any);
    MembershipPolicy.assertCapability(caps, 'LIST_DESIGNATIONS');

    let parsedCursor;
    if (params.cursor) {
      const decoded = Buffer.from(params.cursor, 'base64').toString('utf-8');
      try {
        const parsed = JSON.parse(decoded);
        parsedCursor = parsed.id;
      } catch {
        parsedCursor = undefined;
      }
    }

    const result = await this.designationRepo.list(organizationId, {
      cursor: parsedCursor,
      limit: params.limit,
      includeArchived: params.includeArchived,
    });

    let nextCursor: string | undefined;
    if (result.nextCursor) {
      nextCursor = Buffer.from(JSON.stringify({ id: result.nextCursor })).toString('base64');
    }

    return {
      data: result.data.map(d => ({ ...d.toJSON() })),
      nextCursor,
    };
  }
}
