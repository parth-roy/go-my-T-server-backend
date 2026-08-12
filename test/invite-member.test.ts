import test from 'node:test';
import assert from 'node:assert/strict';
import { InviteMemberUseCase } from '../src/modules/organization/application/use-cases/invite-member.use-case';
import { AppError } from '../src/shared/errors/AppError';

test('Invite Member Capability', async (t) => {

  await t.test('Successful invitation creation', async () => {
    // Mocks
    const invitationRepo: any = {
      save: async () => {},
      findPendingByPhone: async () => null,
      findByTokenHash: async () => null
    };
    
    const membershipRepo: any = {
      findByPhoneAndOrg: async () => null
    };

    const useCase = new InviteMemberUseCase(invitationRepo, membershipRepo);

    const context: any = {
      workspace: { type: 'ORGANIZATION', id: 'org-1' },
      user: { id: 'user-1' },
      platformIdentity: { role: 'ORG_ADMIN' }
    };

    const command = {
      phone: '+919999999999',
      role: 'EMPLOYEE'
    };

    // Should not throw
    await useCase.execute(context, command);
  });

  await t.test('Fails if inviter lacks capability', async () => {
    const invitationRepo: any = {};
    const membershipRepo: any = {};
    const useCase = new InviteMemberUseCase(invitationRepo, membershipRepo);

    const context: any = {
      workspace: { type: 'ORGANIZATION', id: 'org-1' },
      user: { id: 'user-1' },
      platformIdentity: { role: 'VIEWER' } // VIEWER cannot invite
    };

    const command = {
      phone: '+919999999999',
      role: 'EMPLOYEE'
    };

    await assert.rejects(
      useCase.execute(context, command),
      (err: any) => err.statusCode === 403 && err.message.includes('permission')
    );
  });

  await t.test('Fails if target user is already an active member', async () => {
    const membershipRepo: any = {
      findByPhoneAndOrg: async () => {
        return { getStatus: () => 'ACTIVE' };
      }
    };
    const invitationRepo: any = {};
    const useCase = new InviteMemberUseCase(invitationRepo, membershipRepo);

    const context: any = {
      workspace: { type: 'ORGANIZATION', id: 'org-1' },
      user: { id: 'user-1' },
      platformIdentity: { role: 'ORG_ADMIN' }
    };

    const command = {
      phone: '+919999999999',
      role: 'EMPLOYEE'
    };

    await assert.rejects(
      useCase.execute(context, command),
      (err: any) => err.statusCode === 409 && err.message.includes('active member')
    );
  });
});
