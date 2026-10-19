require('dotenv').config();
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { createPool } = require('./pool');

const migrationDirectory = path.join(__dirname, '..', '..', 'migrations');
const advisoryLockKey = 2374802010281;

async function runMigrations(pool, directory = migrationDirectory) {
  const client = await pool.connect();
  let lockAcquired = false;

  try {
    await client.query('SELECT pg_advisory_lock($1)', [advisoryLockKey]);
    lockAcquired = true;
    const legacyTables = await client.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = ANY($1::TEXT[])
       ORDER BY table_name`,
      [[
        'service_center',
        'issue_category',
        'service_centers',
        'issue_categories',
        'customers',
        'products',
        'app_users',
        'tickets',
        'devices',
      ]],
    );
    if (legacyTables.rowCount > 0) {
      const names = legacyTables.rows.map((row) => row.table_name).join(', ');
      throw new Error(
        `Legacy schema detected (${names}); back up the database and use a fresh L4 development database. Migrations never drop existing tables.`,
      );
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        checksum CHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const files = fs.readdirSync(directory)
      .filter((file) => /^\d+_[a-z0-9_-]+\.sql$/i.test(file))
      .sort();

    if (files.length === 0) {
      throw new Error(`No migration SQL files found in ${directory}`);
    }

    for (const filename of files) {
      const sql = fs.readFileSync(path.join(directory, filename), 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      const applied = await client.query(
        'SELECT checksum FROM schema_migrations WHERE filename = $1',
        [filename],
      );

      if (applied.rowCount > 0) {
        if (applied.rows[0].checksum.trim() !== checksum) {
          throw new Error(
            `Applied migration ${filename} was modified; add a new migration instead.`,
          );
        }
        console.log('SKIP', filename);
        continue;
      }

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)',
          [filename, checksum],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${filename} failed: ${error.message}`, { cause: error });
      }

      console.log('OK  ', filename);
    }

    const { rows } = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name <> 'schema_migrations'
       ORDER BY table_name`,
    );
    console.log('Business tables:', rows.map((row) => row.table_name).join(', '));
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
      await runMigrations(pool);
    } catch (error) {
      console.error('Migration failed:', error.message);
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

module.exports = { runMigrations };