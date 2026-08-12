const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveContext } = require('../dist/shared/middleware/context.middleware');
const { workspaceResolverRegistry } = require('../dist/shared/context/workspace-resolver.registry');
const { AppError } = require('../dist/shared/errors/AppError');

test('Request Context Middleware Pipeline', async (t) => {
  // Clear registry for tests
  workspaceResolverRegistry.getResolvers().length = 0;

  // Create a mock resolver
  const mockResolver = {
    canResolve: (req) => !!req.headers['x-mock-id'],
    resolve: async (req, user) => ({
      user: { id: user.id, phone: user.phone, rootRole: user.role },
      workspace: { id: req.headers['x-mock-id'], type: 'MOCK_WORKSPACE' },
      platformIdentity: { type: 'MOCK_MEMBER', role: 'ADMIN' }
    })
  };

  workspaceResolverRegistry.register(mockResolver);

  await t.test('Fails if no req.user', async () => {
    const req = { headers: {} };
    let calledError = null;
    const next = (err) => { calledError = err; };

    await resolveContext(req, {}, next);

    assert.ok(calledError instanceof AppError);
    assert.equal(calledError.statusCode, 401);
  });

  await t.test('Falls back to PERSONAL workspace if no resolvers match', async () => {
    const req = {
      headers: {}, // No x-mock-id
      user: { id: 'u1', phone: '999', role: 'CUSTOMER' }
    };
    let calledError = null;
    const next = (err) => { calledError = err; };

    await resolveContext(req, {}, next);

    assert.equal(calledError, undefined);
    assert.ok(req.context);
    assert.equal(req.context.workspace.type, 'PERSONAL');
    assert.equal(req.context.workspace.id, 'u1');
  });

  await t.test('Uses matched resolver if canResolve returns true', async () => {
    const req = {
      headers: { 'x-mock-id': 'mock-1' },
      user: { id: 'u1', phone: '999', role: 'CUSTOMER' }
    };
    let calledError = null;
    const next = (err) => { calledError = err; };

    await resolveContext(req, {}, next);

    assert.equal(calledError, undefined);
    assert.equal(req.context.workspace.type, 'MOCK_WORKSPACE');
    assert.equal(req.context.workspace.id, 'mock-1');
    assert.equal(req.context.platformIdentity.type, 'MOCK_MEMBER');
  });
});
