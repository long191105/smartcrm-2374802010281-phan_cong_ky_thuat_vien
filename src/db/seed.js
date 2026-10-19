require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { createPool } = require('./pool');

const seedDirectory = path.join(__dirname, '..', '..', 'seeds');
const advisoryLockKey = 2374802010282;

async function runSeeds(pool, directory = seedDirectory) {
  const client = await pool.connect();
  let lockAcquired = false;

  try {
    await client.query('SELECT pg_advisory_lock($1)', [advisoryLockKey]);
    lockAcquired = true;

    const files = fs.readdirSync(directory)
      .filter((file) => /^\d+_[a-z0-9_-]+\.sql$/i.test(file))
      .sort();
    if (files.length === 0) {
      throw new Error(`No seed SQL files found in ${directory}`);
    }

    for (const filename of files) {
      await client.query('BEGIN');
      try {
        await client.query(fs.readFileSync(path.join(directory, filename), 'utf8'));
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Seed ${filename} failed: ${error.message}`, { cause: error });
      }
      console.log('OK  ', filename);
    }
  } finally {
    try {
      if (lockAcquired) {
        await client.query('SELECT pg_advisory_unlock($1)', [advisoryLockKey]);
      }
    } finally {
      client.release();
    }
  }
}

if (require.main === module) {
  (async () => {
    const pool = createPool();
    try {
      await runSeeds(pool);
    } catch (error) {
      console.error('Seed failed:', error.message);
      process.exitCode = 1;
    } finally {
      try {
        await pool.end();
      } catch (error) {
        console.error('Could not close database pool:', error.message);
        process.exitCode = 1;
      }
    }
  })();
}

module.exports = { runSeeds };
