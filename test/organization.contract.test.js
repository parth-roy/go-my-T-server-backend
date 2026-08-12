const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const { CreateOrganizationUseCase } = require('../dist/modules/organization/application/use-cases/create-organization.use-case');
const { OrganizationRepository } = require('../dist/modules/organization/infrastructure/repositories/organization.repository');
const { OrganizationMembershipRepository } = require('../dist/modules/organization/infrastructure/repositories/membership.repository');
const { 
  OrganizationSlugAlreadyExistsError, 
  OrganizationGSTINAlreadyExistsError, 
  OrganizationPANAlreadyExistsError 
} = require('../dist/shared/errors/organization.errors');
const { OrganizationType } = require('../dist/modules/organization/domain/enums/organization.enum');
const { authenticate } = require('../dist/shared/middleware/auth.middleware');
const { prisma } = require('../dist/shared/db/prisma');

test('Create Organization Capability', async (t) => {

  await t.test('Successful organization creation', async () => {
    // Stub prisma transaction
    const originalTx = prisma.$transaction;
    let transactionExecuted = false;
    prisma.$transaction = async (cb) => {
      transactionExecuted = true;
      // Provide a dummy tx client
      return cb({
        organization: { create: async (args) => args.data },
        organizationMembership: { create: async (args) => args.data }
      });
    };

    const useCase = new CreateOrganizationUseCase();
    const result = await useCase.execute('user-123', {
      name: 'Test Org',
      slug: 'test-org-123',
      organizationType: OrganizationType.COMPANY
    });

    assert.equal(transactionExecuted, true);
    assert.equal(result.name, 'Test Org');
    assert.equal(result.slug, 'test-org-123');

    // Restore
    prisma.$transaction = originalTx;
  });

  await t.test('Duplicate slug translates P2002 to OrganizationSlugAlreadyExistsError', async () => {
    const repo = new OrganizationRepository({
      organization: {
        create: async () => {
          const e = new Error();
          e.code = 'P2002';
          e.meta = { target: ['slug'] };
          throw e;
        }
      }
    });

    const { OrganizationFactory } = require('../dist/modules/organization/domain/factories/organization.factory');
    const entity = OrganizationFactory.create(
      randomUUID(), 'duplicate-slug', 'Test', null, null, null, OrganizationType.COMPANY, 'user-1', new Date()
    );

    await assert.rejects(
      async () => { await repo.create(entity); },
      (err) => err instanceof OrganizationSlugAlreadyExistsError
    );
  });

  await t.test('Duplicate GSTIN translates P2002 to OrganizationGSTINAlreadyExistsError', async () => {
    const repo = new OrganizationRepository({
      organization: {
        create: async () => {
          const e = new Error();
          e.code = 'P2002';
          e.meta = { target: ['gstin'] };
          throw e;
        }
      }
    });

    const { OrganizationFactory } = require('../dist/modules/organization/domain/factories/organization.factory');
    const entity = OrganizationFactory.create(
      randomUUID(), 'slug-2', 'Test', null, '07AAAAA0000A1Z5', null, OrganizationType.COMPANY, 'user-1', new Date()
    );

    await assert.rejects(
      async () => { await repo.create(entity); },
      (err) => err instanceof OrganizationGSTINAlreadyExistsError
    );
  });

  await t.test('Duplicate PAN translates P2002 to OrganizationPANAlreadyExistsError', async () => {
    const repo = new OrganizationRepository({
      organization: {
        create: async () => {
          const e = new Error();
          e.code = 'P2002';
          e.meta = { target: ['panNumber'] };
          throw e;
        }
      }
    });

    const { OrganizationFactory } = require('../dist/modules/organization/domain/factories/organization.factory');
    const entity = OrganizationFactory.create(
      randomUUID(), 'slug-3', 'Test', null, null, 'AAAAA0000A', OrganizationType.COMPANY, 'user-1', new Date()
    );

    await assert.rejects(
      async () => { await repo.create(entity); },
      (err) => err instanceof OrganizationPANAlreadyExistsError
    );
  });

  await t.test('Membership creation failure causes transaction rollback', async () => {
    // If membership creation throws, the entire prisma.$transaction callback throws,
    // which automatically triggers Prisma's transaction rollback.
    const originalTx = prisma.$transaction;
    prisma.$transaction = async (cb) => {
      return cb({
        organization: { create: async (args) => args.data },
        organizationMembership: { create: async () => { throw new Error('Simulated DB failure on membership'); } }
      });
    };

    const useCase = new CreateOrganizationUseCase();
    await assert.rejects(
      async () => {
        await useCase.execute('user-123', { name: 'Test Org', slug: 'fail-test' });
      },
      /Simulated DB failure on membership/
    );

    prisma.$transaction = originalTx;
  });

  await t.test('Unauthorized request', async () => {
    // Test the authenticate middleware
    const req = { headers: {} };
    let errorCalled = null;
    const next = (err) => { errorCalled = err; };

    authenticate(req, {}, next);
    
    assert.notEqual(errorCalled, null);
    assert.equal(errorCalled.statusCode, 401);
    assert.equal(errorCalled.message, 'No token provided');
  });

});
