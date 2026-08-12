import test from 'node:test';
import assert from 'node:assert/strict';
import { ValidateInvitationUseCase } from '../src/modules/organization/application/use-cases/validate-invitation.use-case';
import { AcceptInvitationUseCase } from '../src/modules/organization/application/use-cases/accept-invitation.use-case';
import { AppError } from '../src/shared/errors/AppError';
import { OrganizationMembershipInvitation } from '../src/modules/organization/domain/aggregates/invitation.aggregate';
import { OrgRole } from '../src/modules/organization/domain/value-objects/org-role.vo';

import { prisma } from '../src/shared/db/prisma';

// Mock `prisma.$transaction` for the test
(prisma as any).$transaction = async (cb: any) => {
  const tx = {
    organizationMembershipInvitation: {
      upsert: async (args: any) => ({ ...args.create })
    },
    organizationMembership: {
      create: async (args: any) => ({ ...args.data })
    }
  }; 
  await cb(tx);
};


test('Accept Invitation Capability', async (t) => {

  await t.test('Successful token validation masks phone number', async () => {
    const rawToken = 'my-secret-token';
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    const mockInvitationRepo: any = {
      findByTokenHash: async (hash: string) => {
        if (hash === OrganizationMembershipInvitation.hashToken(rawToken)) {
          return OrganizationMembershipInvitation.reconstitute({
            id: 'inv-1',
            organizationId: 'org-1',
            phone: '+919999999999',
            email: null,
            role: new OrgRole('EMPLOYEE'),
            tokenHash: hash,
            status: 'PENDING',
            capabilitySnapshot: null,
            expiresAt: futureDate,
            inviterId: 'user-1'
          });
        }
        return null;
      }
    };

    const mockOrgRepo: any = {
      findById: async (id: string) => {
        return {
          getName: () => 'Test Org'
        };
      }
    };

    const useCase = new ValidateInvitationUseCase(mockInvitationRepo, mockOrgRepo);
    const result = await useCase.execute(rawToken);

    assert.equal(result.organizationName, 'Test Org');
    assert.equal(result.role, 'EMPLOYEE');
    assert.equal(result.phoneMasked, '+91******9999');
  });

  await t.test('Successful invitation acceptance creates membership', async () => {
    const rawToken = 'my-secret-token';
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    const invitation = OrganizationMembershipInvitation.reconstitute({
      id: 'inv-1',
      organizationId: 'org-1',
      phone: '+919999999999',
      email: null,
      role: new OrgRole('EMPLOYEE'),
      tokenHash: OrganizationMembershipInvitation.hashToken(rawToken),
      status: 'PENDING',
      capabilitySnapshot: null,
      expiresAt: futureDate,
      inviterId: 'user-1'
    });

    const mockInvitationRepo: any = {
      findByTokenHash: async () => invitation
    };

    const mockMembershipRepo: any = {
      findByPhoneAndOrg: async () => null // Not a member yet
    };

    const useCase = new AcceptInvitationUseCase(mockInvitationRepo, mockMembershipRepo);

    // Should succeed
    await useCase.execute(rawToken, 'new-user-id', '+919999999999');
    
    assert.equal(invitation.status, 'ACCEPTED');
  });

  await t.test('Acceptance fails if phone number does not match', async () => {
    const rawToken = 'my-secret-token';
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    const invitation = OrganizationMembershipInvitation.reconstitute({
      id: 'inv-1',
      organizationId: 'org-1',
      phone: '+919999999999',
      email: null,
      role: new OrgRole('EMPLOYEE'),
      tokenHash: OrganizationMembershipInvitation.hashToken(rawToken),
      status: 'PENDING',
      capabilitySnapshot: null,
      expiresAt: futureDate,
      inviterId: 'user-1'
    });

    const mockInvitationRepo: any = {
      findByTokenHash: async () => invitation
    };

    const mockMembershipRepo: any = {
      findByPhoneAndOrg: async () => null
    };

    const useCase = new AcceptInvitationUseCase(mockInvitationRepo, mockMembershipRepo);

    await assert.rejects(
      useCase.execute(rawToken, 'new-user-id', '+918888888888'),
      (err: any) => err.statusCode === 403 && err.message.includes('different phone')
    );
  });

  await t.test('Acceptance is idempotent', async () => {
    const rawToken = 'my-secret-token';
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    const invitation = OrganizationMembershipInvitation.reconstitute({
      id: 'inv-1',
      organizationId: 'org-1',
      phone: '+919999999999',
      email: null,
      role: new OrgRole('EMPLOYEE'),
      tokenHash: OrganizationMembershipInvitation.hashToken(rawToken),
      status: 'ACCEPTED', // Already accepted
      capabilitySnapshot: null,
      expiresAt: futureDate,
      inviterId: 'user-1'
    });

    const mockInvitationRepo: any = {
      findByTokenHash: async () => invitation
    };

    const mockMembershipRepo: any = {
      findByPhoneAndOrg: async () => {
        return { getStatus: () => 'ACTIVE' }; // Already a member
      }
    };

    const useCase = new AcceptInvitationUseCase(mockInvitationRepo, mockMembershipRepo);

    // Should succeed silently (idempotent)
    await useCase.execute(rawToken, 'existing-user-id', '+919999999999');
    
    assert.equal(invitation.status, 'ACCEPTED');
  });
});
