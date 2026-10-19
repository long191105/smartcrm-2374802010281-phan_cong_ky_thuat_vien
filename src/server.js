require('dotenv').config();

const { createApp } = require('./app');
const { createPool } = require('./db/pool');

function getPort(env = process.env) {
  const port = Number(env.PORT || env.APP_PORT || 8000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  return port;
}

function startServer() {
  const port = getPort();
  const pool = createPool();
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
  try {
    startServer();
  } catch (error) {
    console.error('Application startup failed:', error.message);
    process.exitCode = 1;
  }
}

module.exports = { getPort, startServer };
