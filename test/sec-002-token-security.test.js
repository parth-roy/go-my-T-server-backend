const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

// Import built modules from dist
const { env } = require('../dist/config/env');
const { authenticate, optionalAuth } = require('../dist/shared/middleware/auth.middleware');

test('SEC-002: authenticate rejects refresh tokens signed with JWT_ACCESS_SECRET (token confusion attempt)', () => {
  const syntheticRefreshToken = jwt.sign(
    { userId: 'u1', role: 'CUSTOMER', type: 'refresh' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '30d' }
  );

  const req = {
    headers: {
      authorization: `Bearer ${syntheticRefreshToken}`,
    },
  };
  let errorReceived = null;
  const next = (err) => {
    errorReceived = err;
  };

  authenticate(req, {}, next);

  assert.ok(errorReceived, 'Should produce an error');
  assert.equal(errorReceived.statusCode, 401);
  assert.equal(errorReceived.message, 'Invalid token type');
  assert.equal(req.user, undefined);
});

test('SEC-002: authenticate rejects refresh tokens signed with separate JWT_REFRESH_SECRET', () => {
  const genuineRefreshToken = jwt.sign(
    { userId: 'u2', role: 'DRIVER', type: 'refresh' },
    env.JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );

  const req = {
    headers: {
      authorization: `Bearer ${genuineRefreshToken}`,
    },
  };
  let errorReceived = null;
  const next = (err) => {
    errorReceived = err;
  };

  authenticate(req, {}, next);

  assert.ok(errorReceived, 'Should produce an error');
  assert.equal(errorReceived.statusCode, 401);
  assert.equal(errorReceived.message, 'Invalid token');
  assert.equal(req.user, undefined);
});

test('SEC-002: authenticate accepts valid access tokens with type: access', () => {
  const validAccessToken = jwt.sign(
    { userId: 'u3', phone: '9876543210', role: 'CUSTOMER', type: 'access' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );

  const req = {
    headers: {
      authorization: `Bearer ${validAccessToken}`,
    },
  };
  let nextCalled = false;
  const next = (err) => {
    assert.ifError(err);
    nextCalled = true;
  };

  authenticate(req, {}, next);

  assert.equal(nextCalled, true);
  assert.deepEqual(req.user, { id: 'u3', phone: '9876543210', role: 'CUSTOMER' });
});

test('SEC-002: optionalAuth ignores refresh tokens and does not populate req.user', () => {
  const refreshToken = jwt.sign(
    { userId: 'u4', role: 'WORKER', type: 'refresh' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '30d' }
  );

  const req = {
    headers: {
      authorization: `Bearer ${refreshToken}`,
    },
  };
  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  optionalAuth(req, {}, next);

  assert.equal(nextCalled, true);
  assert.equal(req.user, undefined);
});

test('SEC-002: optionalAuth populates req.user for valid access token', () => {
  const accessToken = jwt.sign(
    { userId: 'u5', phone: '9998887776', role: 'WORKER', type: 'access' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );

  const req = {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  };
  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  optionalAuth(req, {}, next);

  assert.equal(nextCalled, true);
  assert.deepEqual(req.user, { id: 'u5', phone: '9998887776', role: 'WORKER' });
});

test('SEC-002: refreshTokens rejects access tokens with type: access', async () => {
  const { refreshTokens } = require('../dist/modules/auth/auth.service');
  const accessToken = jwt.sign(
    { userId: 'u6', phone: '9123456780', role: 'CUSTOMER', type: 'access' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );

  await assert.rejects(
    async () => {
      await refreshTokens({ refreshToken: accessToken });
    },
    (err) => {
      assert.equal(err.statusCode, 401);
      assert.match(err.message, /cannot use access token to refresh|Invalid token/i);
      return true;
    }
  );
});

