require('dotenv').config();

const { createPool } = require('./pool');
const { AuthRepository } = require('../repositories/auth.repository');
const { AuthService } = require('../services/auth.service');

async function bootstrapUser(env = process.env) {
  const username = env.AUTH_BOOTSTRAP_USERNAME;
  const password = env.AUTH_BOOTSTRAP_PASSWORD;
  const displayName = env.AUTH_BOOTSTRAP_DISPLAY_NAME;
  if (!username || !password) {
    throw new Error(
      'Set AUTH_BOOTSTRAP_USERNAME and AUTH_BOOTSTRAP_PASSWORD in .env before creating the initial account.',
    );
  }
  const pool = createPool(env);
  try {
    const authService = new AuthService(new AuthRepository(pool));
    const user = await authService.bootstrapUser({ username, password, displayName });
    console.log(`Login account ready for "${user.username}".`);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  bootstrapUser().catch((error) => {
    console.error('Could not create login account:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { bootstrapUser };
