import test from 'node:test';
import assert from 'node:assert/strict';
import { ChangeMemberRoleUseCase } from '../src/modules/organization/application/use-cases/change-member-role.use-case';
import { SuspendMemberUseCase } from '../src/modules/organization/application/use-cases/suspend-member.use-case';
import { ReactivateMemberUseCase } from '../src/modules/organization/application/use-cases/reactivate-member.use-case';
import { TerminateMemberUseCase } from '../src/modules/organization/application/use-cases/terminate-member.use-case';
import { OrganizationMembershipEntity } from '../src/modules/organization/domain/entities/membership.entity';
import { OrganizationRole, MembershipStatus } from '../src/modules/organization/domain/enums/membership.enum';
import { RequestContext } from '../src/shared/context/request-context';

import { prisma } from '../src/shared/db/prisma';

// Mock `prisma.$transaction` for the test
(prisma as any).$transaction = async (cb: any) => {
  const tx = {
    organizationMembership: {
      update: async (args: any) => ({ ...args.data })
    }
  }; 
  await cb(tx);
};

test('Membership Management Capabilities', async (t) => {
  
  const mockAdminContext: RequestContext = {
    user: {
      id: 'admin-user',
      phone: '+919999999999',
      rootRole: 'USER'
    },
    platformIdentity: {
      type: 'ORGANIZATION_MEMBER',
      role: OrganizationRole.ORG_ADMIN
    },
    workspace: {
      id: 'org-1',
      type: 'ORGANIZATION'
    }
  } as RequestContext;

  const getMockRepo = (member: OrganizationMembershipEntity): any => ({
    findById: async () => member,
    update: async () => member
  });

  await t.test('Admin can change role of an employee', async () => {
    const member = OrganizationMembershipEntity.reconstitute(
      'mem-1', 'org-1', 'employee-user', OrganizationRole.EMPLOYEE, MembershipStatus.ACTIVE, new Date(), new Date(), new Date()
    );

    const useCase = new ChangeMemberRoleUseCase(getMockRepo(member));
    await useCase.execute(mockAdminContext, 'mem-1', OrganizationRole.SUPERVISOR);

    assert.equal(member.getRole(), OrganizationRole.SUPERVISOR);
  });

  await t.test('Admin cannot change own role', async () => {
    const member = OrganizationMembershipEntity.reconstitute(
      'mem-admin', 'org-1', 'admin-user', OrganizationRole.ORG_ADMIN, MembershipStatus.ACTIVE, new Date(), new Date(), new Date()
    );

    const useCase = new ChangeMemberRoleUseCase(getMockRepo(member));
    
    await assert.rejects(
      useCase.execute(mockAdminContext, 'mem-admin', OrganizationRole.EMPLOYEE),
      (err: any) => err.statusCode === 403 && err.message.includes('change role of yourself')
    );
  });

  await t.test('Admin can suspend employee', async () => {
    const member = OrganizationMembershipEntity.reconstitute(
      'mem-1', 'org-1', 'employee-user', OrganizationRole.EMPLOYEE, MembershipStatus.ACTIVE, new Date(), new Date(), new Date()
    );

    const useCase = new SuspendMemberUseCase(getMockRepo(member));
    await useCase.execute(mockAdminContext, 'mem-1');

    assert.equal(member.getStatus(), MembershipStatus.SUSPENDED);
  });

  await t.test('Admin cannot suspend primary owner', async () => {
    const member = OrganizationMembershipEntity.reconstitute(
      'mem-owner', 'org-1', 'owner-user', OrganizationRole.PRIMARY_OWNER, MembershipStatus.ACTIVE, new Date(), new Date(), new Date()
    );

    const useCase = new SuspendMemberUseCase(getMockRepo(member));
    
    await assert.rejects(
      useCase.execute(mockAdminContext, 'mem-owner'),
      (err: any) => err.message.includes('suspend the primary owner') // from entity
    );
  });

  await t.test('Admin can reactivate suspended member', async () => {
    const member = OrganizationMembershipEntity.reconstitute(
      'mem-1', 'org-1', 'employee-user', OrganizationRole.EMPLOYEE, MembershipStatus.SUSPENDED, new Date(), new Date(), new Date()
    );

    const useCase = new ReactivateMemberUseCase(getMockRepo(member));
    await useCase.execute(mockAdminContext, 'mem-1');

    assert.equal(member.getStatus(), MembershipStatus.ACTIVE);
  });

  await t.test('Admin can terminate member', async () => {
    const member = OrganizationMembershipEntity.reconstitute(
      'mem-1', 'org-1', 'employee-user', OrganizationRole.EMPLOYEE, MembershipStatus.ACTIVE, new Date(), new Date(), new Date()
    );

    const useCase = new TerminateMemberUseCase(getMockRepo(member));
    await useCase.execute(mockAdminContext, 'mem-1');

    assert.equal(member.getStatus(), MembershipStatus.TERMINATED);
  });

});
