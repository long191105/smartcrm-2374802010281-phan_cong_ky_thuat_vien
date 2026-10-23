const assert = require('node:assert/strict');
const test = require('node:test');
const { AuthService } = require('../src/services/auth.service');

function createRepository() {
  const users = new Map();
  const sessions = new Map();
  let nextUserId = 1;
  return {
    users,
    sessions,
    async findUserByUsername(username) {
      return users.get(username) || null;
    },
    async createSession(userId, tokenHash, expiresAt) {
      sessions.set(tokenHash, { userId, expiresAt });
    },
    async findActiveSession(tokenHash) {
      const session = sessions.get(tokenHash);
      if (!session || session.expiresAt <= new Date()) return null;
      return [...users.values()].find((user) => user.user_id === session.userId) || null;
    },
    async deleteSession(tokenHash) {
      sessions.delete(tokenHash);
    },
    async upsertBootstrapUser({ username, displayName, passwordHash }) {
      const previous = users.get(username);
      const user = {
        user_id: previous?.user_id || nextUserId++,
        username,
        display_name: displayName,
        password_hash: passwordHash,
      };
      users.set(username, user);
      return user;
    },
  };
}

test('bootstrap, login, session lookup and logout manage hashed credentials and session IDs', async () => {
  const repository = createRepository();
  const auth = new AuthService(repository);
  await auth.bootstrapUser({
    username: 'Manager',
    password: 'a-strong-password',
    displayName: 'Quản lý',
  });

  const storedUser = repository.users.get('manager');
  assert.match(storedUser.password_hash, /^scrypt\$/);
  assert.notEqual(storedUser.password_hash, 'a-strong-password');

  const session = await auth.login({
    username: 'MANAGER',
    password: 'a-strong-password',
  });
  assert.equal(session.user.username, 'manager');
  assert.equal(session.user.displayName, 'Quản lý');
  assert.equal(session.sessionToken.length, 64);
  const [storedTokenHash] = repository.sessions.keys();
  assert.notEqual(storedTokenHash, session.sessionToken);
  assert.deepEqual(await auth.authenticateSession(session.sessionToken), session.user);

  await auth.logout(session.sessionToken);
  assert.equal(await auth.authenticateSession(session.sessionToken), null);
});

test('invalid credentials return the same unauthorized error for unknown users and wrong passwords', async () => {
  const repository = createRepository();
  const auth = new AuthService(repository);
  await auth.bootstrapUser({
    username: 'manager',
    password: 'a-strong-password',
    displayName: 'Quản lý',
  });

  for (const credentials of [
    { username: 'manager', password: 'incorrect-password' },
    { username: 'missing', password: 'incorrect-password' },
  ]) {
    await assert.rejects(
      auth.login(credentials),
      (error) => error.statusCode === 401 && error.code === 'INVALID_CREDENTIALS',
    );
  }
});

test('bootstrap enforces a unique account username and a strong initial password', async () => {
  const auth = new AuthService(createRepository());

  await assert.rejects(
    auth.bootstrapUser({ username: 'ab', password: 'short', displayName: 'User' }),
    (error) => error.name === 'ZodError',
  );
});
