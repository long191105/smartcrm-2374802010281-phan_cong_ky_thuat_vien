const { randomBytes, createHash, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const { z } = require('zod');
const { AppError } = require('../errors/AppError');
const { validate } = require('../validation');

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const DUMMY_PASSWORD_HASH = `scrypt$${'0'.repeat(32)}$${'0'.repeat(KEY_LENGTH * 2)}`;
const loginSchema = z.object({
  username: z.string().trim().min(1).max(64).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, KEY_LENGTH);
  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, passwordHash) {
  const [algorithm, salt, encodedKey] = passwordHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !/^[a-f0-9]{128}$/i.test(encodedKey || '')) {
    return false;
  }

  const expected = Buffer.from(encodedKey, 'hex');
  const actual = await scryptAsync(password, salt, KEY_LENGTH);
  return timingSafeEqual(expected, actual);
}

function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function publicUser(user) {
  return {
    username: user.username,
    displayName: user.display_name,
  };
}

class AuthService {
  constructor(authRepository) {
    this.authRepository = authRepository;
  }

  async login(body) {
    const input = validate(loginSchema, body);
    const user = await this.authRepository.findUserByUsername(input.username);
    const passwordMatches = await verifyPassword(
      input.password,
      user ? user.password_hash : DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Tên đăng nhập hoặc mật khẩu không đúng.');
    }

    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.authRepository.createSession(
      user.user_id,
      hashSessionToken(sessionToken),
      expiresAt,
    );
    return { sessionToken, user: publicUser(user) };
  }

  async authenticateSession(sessionToken) {
    if (typeof sessionToken !== 'string' || !/^[a-f0-9]{64}$/i.test(sessionToken)) {
      return null;
    }
    const user = await this.authRepository.findActiveSession(hashSessionToken(sessionToken));
    return user ? publicUser(user) : null;
  }

  async logout(sessionToken) {
    if (typeof sessionToken === 'string' && /^[a-f0-9]{64}$/i.test(sessionToken)) {
      await this.authRepository.deleteSession(hashSessionToken(sessionToken));
    }
  }

  async bootstrapUser({ username, password, displayName }) {
    const normalizedUsername = z.string().trim().min(3).max(64)
      .parse(username).toLowerCase();
    const validatedPassword = z.string().min(12).max(128).parse(password);
    const normalizedDisplayName = z.string().trim().min(1).max(100)
      .parse(displayName || normalizedUsername);
    const passwordHash = await hashPassword(validatedPassword);
    return this.authRepository.upsertBootstrapUser({
      username: normalizedUsername,
      displayName: normalizedDisplayName,
      passwordHash,
    });
  }
}

module.exports = { AuthService, hashPassword, verifyPassword };
