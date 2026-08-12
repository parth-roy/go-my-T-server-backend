import { ITeamRepository } from '../../domain/repositories/team.repository.interface';
import { AppError } from '@shared/errors/AppError';
import { TeamResponseDto } from '../dtos/team.dto';
import { MembershipPolicy } from '../../domain/policies/membership.policy';
import { RequestContext } from '@shared/context/request-context';
import { CapabilityResolver } from '../../domain/services/capability-resolver.domain-service';

export class ListTeamsUseCase {
  constructor(private readonly teamRepo: ITeamRepository) {}

  async execute(
    context: RequestContext,
    branchId: string,
    departmentId: string,
    params: {
      limit: number;
      cursor?: string;
      search?: string;
      includeArchived?: boolean;
    }
  ): Promise<{ data: TeamResponseDto[]; nextCursor?: string }> {
    const organizationId = context.organization!.id;
    if (!organizationId) {
      throw AppError.internal('Organization Context Missing');
    }

    const caps = CapabilityResolver.resolve(context.platformIdentity.role as any);
    MembershipPolicy.assertCapability(caps, 'LIST_TEAMS');

    let parsedCursor;
    if (params.cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(params.cursor, 'base64').toString('ascii'));
        if (decoded.id && decoded.createdAt) {
          parsedCursor = {
            id: decoded.id,
            createdAt: new Date(decoded.createdAt)
          };
        }
      } catch (e) {
        throw AppError.badRequest('Invalid cursor format');
      }
    }

    const result = await this.teamRepo.list(organizationId, branchId, departmentId, {
      limit: params.limit,
      cursor: parsedCursor,
      search: params.search,
      includeArchived: params.includeArchived
    });

    const data = result.data.map(team => ({
      id: team.getId(),
      organizationId: team.getOrganizationId(),
      branchId: team.getBranchId(),
      departmentId: team.getDepartmentId(),
      name: team.getName(),
      code: team.getCode(),
      description: team.getDescription(),
      leaderId: team.getLeaderId(),
      status: team.getStatus(),
      createdAt: team.getCreatedAt(),
      updatedAt: team.getUpdatedAt()
    }));

    let nextCursor;
    if (result.hasNextPage && data.length > 0) {
      const last = data[data.length - 1];
      nextCursor = Buffer.from(JSON.stringify({
        id: last.id,
        createdAt: last.createdAt
      })).toString('base64');
    }

    return { data, nextCursor };
  }
}
