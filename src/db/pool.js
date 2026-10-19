const { Pool } = require('pg');

function createPool(env = process.env) {
  const connectionTimeoutMillis = 5000;

  if (env.DATABASE_URL) {
    return new Pool({
      connectionString: env.DATABASE_URL,
      connectionTimeoutMillis,
    });
  }

  const missing = ['DB_NAME', 'DB_USER'].filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing database configuration: ${missing.join(', ')}`);
  }

  const port = Number(env.DB_PORT || 5432);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT must be an integer between 1 and 65535');
  }

  return new Pool({
    host: env.DB_HOST || 'localhost',
    port,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    connectionTimeoutMillis,
  });
}

module.exports = { createPool };
