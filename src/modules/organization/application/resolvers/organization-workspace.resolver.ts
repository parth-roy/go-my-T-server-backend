import { Request } from 'express';
import { IWorkspaceResolver } from '@shared/context/workspace-resolver.interface';
import { RequestContext } from '@shared/context/request-context';
import { prisma } from '@shared/db/prisma';
import { getRedis } from '@config/redis';
import { AppError } from '@shared/errors/AppError';

const CACHE_TTL_SECONDS = 300; // 5 minutes

export class OrganizationWorkspaceResolver implements IWorkspaceResolver {
  canResolve(req: Request): boolean {
    return !!req.headers['x-organization-id'];
  }

  async resolve(req: Request, user: { id: string; phone: string; role: string }): Promise<RequestContext> {
    const orgId = req.headers['x-organization-id'] as string;
    const cacheKey = `org_member:${orgId}:${user.id}`;
    const redis = getRedis();
    let membershipData: any = null;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        membershipData = JSON.parse(cached);
      }
    } catch (e) {
      // Redis error, fallback to DB
    }

    if (!membershipData) {
      const membership = await prisma.organizationMembership.findFirst({
        where: {
          organizationId: orgId,
          userId: user.id,
          status: 'ACTIVE'
        },
        include: {
          organization: {
            select: {
              id: true,
              status: true
            }
          }
        }
      });

      if (!membership) {
        throw AppError.forbidden('You are not an active member of this organization');
      }

      if (membership.organization.status !== 'ACTIVE') {
        throw AppError.forbidden('This organization is not active');
      }

      membershipData = {
        id: membership.id,
        role: membership.role,
        status: membership.status,
        organization: {
          id: membership.organization.id,
          status: membership.organization.status
        }
      };

      try {
        await redis.set(cacheKey, JSON.stringify(membershipData), 'EX', CACHE_TTL_SECONDS);
      } catch (e) {
        // Redis save error, ignore
      }
    }

    return {
      user: { id: user.id, phone: user.phone, rootRole: user.role },
      workspace: {
        id: orgId,
        type: 'ORGANIZATION'
      },
      platformIdentity: {
        type: 'ORGANIZATION_MEMBER',
        role: membershipData.role
      },
      membership: {
        id: membershipData.id,
        role: membershipData.role,
        status: membershipData.status
      },
      organization: {
        id: membershipData.organization.id,
        status: membershipData.organization.status
      }
    };
  }
}
