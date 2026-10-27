import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';

const envKeys = ['ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET', 'NODE_ENV', 'DATABASE_PATH'];
const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

let app;
let server;
let baseUrl;
let tempDirectory;

before(async () => {
  tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'personal-expense-auth-test-'));
  process.env.ACCESS_TOKEN_SECRET = 'test-access-token-secret-at-least-32-characters';
  process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret-at-least-32-characters';
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_PATH = path.join(tempDirectory, 'db.json');

  await fs.writeFile(process.env.DATABASE_PATH, JSON.stringify({
    users: [],
    categories: [],
    transactions: [],
    budgets: [],
    recurringTransactions: [],
    refreshTokens: [],
  }));

  ({ default: app } = await import('../app.js'));
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}/api/auth`;
});

after(async () => {
  if (server) {
    const closed = once(server, 'close');
    server.close();
    server.closeAllConnections();
    await closed;
  }
  if (tempDirectory) await fs.rm(tempDirectory, { recursive: true, force: true });

  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function request(route, { method = 'POST', body, headers = {} } = {}) {
  return fetch(`${baseUrl}/${route}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function cookieFrom(response) {
  const cookie = response.headers.get('set-cookie');
  assert.ok(cookie, 'expected the response to set a refresh cookie');
  return cookie.split(';', 1)[0];
}

test('authentication routes', async (t) => {
  const credentials = {
    email: 'Route.Test@example.com',
    username: 'Route_Test',
    password: 'StrongPass123',
  };
  let registrationCookie;
  let accessToken;

  await t.test('registers users, validates input, and prevents duplicate accounts', async () => {
    const response = await request('register', { body: credentials });
    assert.equal(response.status, 201);

    const result = await response.json();
    assert.equal(result.user.email, 'route.test@example.com');
    assert.equal(result.user.username, 'route_test');
    assert.equal('passwordHash' in result.user, false);
    assert.ok(result.accessToken);
    accessToken = result.accessToken;
    registrationCookie = cookieFrom(response);
    assert.match(response.headers.get('set-cookie'), /HttpOnly/i);

    const invalid = await request('register', {
      body: { ...credentials, email: 'not-an-email' },
    });
    assert.equal(invalid.status, 422);
    assert.equal((await invalid.json()).message, 'Validation failed');

    const duplicate = await request('register', { body: credentials });
    assert.equal(duplicate.status, 409);
  });

  await t.test('logs in with a username and rejects invalid credentials', async () => {
    const invalid = await request('login', {
      body: { identifier: credentials.username, password: 'WrongPass123' },
    });
    assert.equal(invalid.status, 401);

    const response = await request('login', {
      body: { identifier: credentials.username, password: credentials.password },
    });
    assert.equal(response.status, 200);
    assert.ok((await response.json()).accessToken);
    assert.match(response.headers.get('set-cookie'), /HttpOnly/i);
  });

  await t.test('protects the current-user route with an access token', async () => {
    const unauthenticated = await request('me', { method: 'GET' });
    assert.equal(unauthenticated.status, 401);

    const authenticated = await request('me', {
      method: 'GET',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    assert.equal(authenticated.status, 200);
    assert.equal((await authenticated.json()).user.username, 'route_test');
  });

  await t.test('rotates refresh tokens and rejects reuse of a rotated token', async () => {
    const missingCookie = await request('refresh');
    assert.equal(missingCookie.status, 401);

    const response = await request('refresh', {
      headers: { cookie: registrationCookie },
    });
    assert.equal(response.status, 200);
    assert.ok((await response.json()).accessToken);

    const rotatedCookie = cookieFrom(response);
    assert.notEqual(rotatedCookie, registrationCookie);

    const replay = await request('refresh', {
      headers: { cookie: registrationCookie },
    });
    assert.equal(replay.status, 401);
  });

  await t.test('logs out and revokes the refresh session', async () => {
    const login = await request('login', {
      body: { identifier: credentials.email, password: credentials.password },
    });
    assert.equal(login.status, 200);
    const loginCookie = cookieFrom(login);

    const logout = await request('logout', {
      headers: { cookie: loginCookie },
    });
    assert.equal(logout.status, 204);
    assert.match(logout.headers.get('set-cookie'), /refreshToken=;/);

    const refreshAfterLogout = await request('refresh', {
      headers: { cookie: loginCookie },
    });
    assert.equal(refreshAfterLogout.status, 401);
  });
});
