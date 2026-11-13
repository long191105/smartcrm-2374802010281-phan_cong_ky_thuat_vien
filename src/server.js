require('dotenv').config();

const { createApp } = require('./app');
const { loadConfig } = require('./config');
const { initializeDatabase } = require('./db/initialize');
const { createPool } = require('./db/pool');

function getPort(env = process.env) {
  const port = Number(env.PORT || env.APP_PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('APP_PORT must be an integer between 1 and 65535');
  }
  return port;
}

async function startServer(env = process.env) {
  const config = loadConfig(env);
  const port = config.port || getPort(env);
  const pool = createPool(env);
  try {
    await initializeDatabase(pool, env);
  } catch (error) {
    await pool.end();
    throw error;
  }
  const app = createApp({ pool });
  const server = app.listen(port, () => {
    console.log(`Smart CRM L4 API listening on port ${port}`);
  });

  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received; shutting down`);

    server.close((serverError) => {
      pool.end()
        .then(() => {
          if (serverError) {
            console.error('HTTP server shutdown failed:', serverError);
            process.exitCode = 1;
          }
        })
        .catch((databaseError) => {
          console.error('Database pool shutdown failed:', databaseError);
          process.exitCode = 1;
        });
    });
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));

  server.on('error', (error) => {
    console.error('HTTP server failed:', error);
    pool.end()
      .catch((databaseError) => {
        console.error('Database pool shutdown failed:', databaseError);
      })
      .finally(() => {
        process.exitCode = 1;
      });
  });

  return { app, pool, server };
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Application startup failed:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { getPort, startServer };
