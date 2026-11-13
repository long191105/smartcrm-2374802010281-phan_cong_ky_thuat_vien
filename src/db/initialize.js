const { AuthRepository } = require('../repositories/auth.repository');
const { AuthService } = require('../services/auth.service');
const { runMigrations } = require('./migrate');
const { runSeeds } = require('./seed');

async function initializeDatabase(pool, env = process.env) {
  await runMigrations(pool);
  await runSeeds(pool);

  const authService = new AuthService(new AuthRepository(pool));
  await authService.bootstrapUser({
    username: env.AUTH_BOOTSTRAP_USERNAME,
    password: env.AUTH_BOOTSTRAP_PASSWORD,
    displayName: env.AUTH_BOOTSTRAP_DISPLAY_NAME,
  });
  console.log('Database migrations, sample data, and demo account are ready.');
}

module.exports = { initializeDatabase };
