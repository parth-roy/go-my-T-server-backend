import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import { RealPerformanceAuthorizationService } from '../../auth/RealPerformanceAuthorizationService';
import { PrismaClient } from '@prisma/client';
import { RequestContext } from '../../../../../shared/context/request-context';
import { AppError } from '../../../../../shared/errors/AppError';

describe('RealPerformanceAuthorizationService (Integration)', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    const url = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/defaultdb?sslmode=require';
    prisma = new PrismaClient({ datasources: { db: { url } } });
    await prisma.$connect();
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.organizationMembership.deleteMany({});
    await prisma.organization.deleteMany({});
    await prisma.user.deleteMany({});
  });

  it('1. Same user + two organizations: blocks access when active organization mismatches membership', async () => {
    const user = await prisma.user.create({ data: { id: 'user-1', phone: '1234567890', role: 'CUSTOMER' } });
    const org1 = await prisma.organization.create({ data: { id: 'org-1', name: 'Org 1', slug: 'org-1' } });
    const org2 = await prisma.organization.create({ data: { id: 'org-2', name: 'Org 2', slug: 'org-2' } });
    
    // User is a member of org1
    const membership1 = await prisma.organizationMembership.create({
      data: { id: 'mem-1', userId: user.id, organizationId: org1.id, role: 'EMPLOYEE', status: 'ACTIVE' }
    });

    const context: RequestContext = {
      user: { id: user.id, phone: user.phone, rootRole: user.role },
      workspace: { id: org2.id, type: 'ORGANIZATION' },
      platformIdentity: { type: 'ORGANIZATION_MEMBER', role: 'EMPLOYEE' },
      organization: { id: org2.id, status: 'ACTIVE' }, // Context claims active org is org2
      membership: { id: membership1.id, role: 'EMPLOYEE', status: 'ACTIVE' } // Context provides membership from org1
    };

    const authService = new RealPerformanceAuthorizationService(prisma, context);

    await expect(authService.checkPermission(user.id, 'READ_DASHBOARD', membership1.id))
      .rejects.toThrow('Active membership does not belong to the active organization.');
  });

  it('2. Blocked if membership does not belong to user', async () => {
    const user1 = await prisma.user.create({ data: { id: 'user-1', phone: '1111111111', role: 'CUSTOMER' } });
    const user2 = await prisma.user.create({ data: { id: 'user-2', phone: '2222222222', role: 'CUSTOMER' } });
    const org1 = await prisma.organization.create({ data: { id: 'org-1', name: 'Org 1', slug: 'org-1' } });
    
    // Membership belongs to user2
    const membership = await prisma.organizationMembership.create({
      data: { id: 'mem-2', userId: user2.id, organizationId: org1.id, role: 'EMPLOYEE', status: 'ACTIVE' }
    });

    // Request is from user1 claiming membership of user2
    const context: RequestContext = {
      user: { id: user1.id, phone: user1.phone, rootRole: user1.role },
      workspace: { id: org1.id, type: 'ORGANIZATION' },
      platformIdentity: { type: 'ORGANIZATION_MEMBER', role: 'EMPLOYEE' },
      organization: { id: org1.id, status: 'ACTIVE' },
      membership: { id: membership.id, role: 'EMPLOYEE', status: 'ACTIVE' }
    };

    const authService = new RealPerformanceAuthorizationService(prisma, context);

    await expect(authService.checkPermission(user1.id, 'READ_DASHBOARD', membership.id))
      .rejects.toThrow('Active membership does not belong to the authenticated user.');
  });

  it('3. Successful access when user, membership, and organization match and role allows', async () => {
    const user = await prisma.user.create({ data: { id: 'user-1', phone: '1234567890', role: 'CUSTOMER' } });
    const org1 = await prisma.organization.create({ data: { id: 'org-1', name: 'Org 1', slug: 'org-1' } });
    
    // User is an HR member of org1
    const membership1 = await prisma.organizationMembership.create({
      data: { id: 'mem-1', userId: user.id, organizationId: org1.id, role: 'HR', status: 'ACTIVE' }
    });

    const context: RequestContext = {
      user: { id: user.id, phone: user.phone, rootRole: user.role },
      workspace: { id: org1.id, type: 'ORGANIZATION' },
      platformIdentity: { type: 'ORGANIZATION_MEMBER', role: 'HR' },
      organization: { id: org1.id, status: 'ACTIVE' },
      membership: { id: membership1.id, role: 'HR', status: 'ACTIVE' }
    };

    const authService = new RealPerformanceAuthorizationService(prisma, context);

    // HR can READ_DASHBOARD of another membership (resourceId)
    await expect(authService.checkPermission(user.id, 'READ_DASHBOARD', 'some-other-membership-id'))
      .resolves.toBeUndefined();
  });

  it('4. Worker role cannot access other worker dashboard', async () => {
    const user = await prisma.user.create({ data: { id: 'user-1', phone: '1234567890', role: 'CUSTOMER' } });
    const org1 = await prisma.organization.create({ data: { id: 'org-1', name: 'Org 1', slug: 'org-1' } });
    
    // User is a WORKER member of org1
    const membership1 = await prisma.organizationMembership.create({
      data: { id: 'mem-1', userId: user.id, organizationId: org1.id, role: 'EMPLOYEE', status: 'ACTIVE' }
    });

    const context: RequestContext = {
      user: { id: user.id, phone: user.phone, rootRole: user.role },
      workspace: { id: org1.id, type: 'ORGANIZATION' },
      platformIdentity: { type: 'ORGANIZATION_MEMBER', role: 'EMPLOYEE' },
      organization: { id: org1.id, status: 'ACTIVE' },
      membership: { id: membership1.id, role: 'EMPLOYEE', status: 'ACTIVE' }
    };

    const authService = new RealPerformanceAuthorizationService(prisma, context);

    // Worker trying to read another membership dashboard
    await expect(authService.checkPermission(user.id, 'READ_DASHBOARD', 'some-other-membership-id'))
      .rejects.toThrow('Worker can only view their own performance data.');
  });
});
