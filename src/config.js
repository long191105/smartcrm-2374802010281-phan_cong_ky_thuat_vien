require('dotenv').config();

function loadConfig(env = process.env) {
  const missing = [];

  if (!env.DATABASE_URL) {
    missing.push(...['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']
      .filter((name) => !env[name]));
  }
  missing.push(...[
    'AUTH_BOOTSTRAP_USERNAME',
    'AUTH_BOOTSTRAP_PASSWORD',
    'AUTH_BOOTSTRAP_DISPLAY_NAME',
  ].filter((name) => !env[name]));

  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
  }

  if (env.AUTH_BOOTSTRAP_USERNAME.trim().length < 3
    || env.AUTH_BOOTSTRAP_USERNAME.trim().length > 64) {
    throw new Error('AUTH_BOOTSTRAP_USERNAME must contain 3 to 64 characters');
  }
  if (env.AUTH_BOOTSTRAP_PASSWORD.length < 12 || env.AUTH_BOOTSTRAP_PASSWORD.length > 128) {
    throw new Error('AUTH_BOOTSTRAP_PASSWORD must contain 12 to 128 characters');
  }
  if (env.AUTH_BOOTSTRAP_DISPLAY_NAME.trim().length < 1
    || env.AUTH_BOOTSTRAP_DISPLAY_NAME.trim().length > 100) {
    throw new Error('AUTH_BOOTSTRAP_DISPLAY_NAME must contain 1 to 100 characters');
  }

  const port = Number(env.PORT || env.APP_PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('APP_PORT must be an integer between 1 and 65535');
  }

  return { port };
}

module.exports = { loadConfig };
