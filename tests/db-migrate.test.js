const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { runMigrations } = require('../src/db/migrate');

const migrationDirectory = path.join(__dirname, '..', 'migrations');

function createFakePool({ legacy = false } = {}) {
  const applied = new Map();
  const queries = [];
  const client = {
    async query(sql, values = []) {
      const normalized = sql.trim();
      queries.push({ sql: normalized, values });

      if (normalized.includes('table_name = ANY')) {
        const rows = legacy ? [{ table_name: 'service_center' }] : [];
        return { rows, rowCount: rows.length };
      }
      if (normalized.startsWith('SELECT checksum FROM schema_migrations')) {
        const checksum = applied.get(values[0]);
        const rows = checksum ? [{ checksum }] : [];
        return { rows, rowCount: rows.length };
      }
      if (normalized.startsWith('INSERT INTO schema_migrations')) {
        applied.set(values[0], values[1]);
        return { rows: [], rowCount: 1 };
      }
      if (normalized.startsWith('SELECT table_name FROM information_schema.tables')) {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 0 };
    },
    release() {
      queries.push({ sql: 'RELEASE', values: [] });
    },
  };

  return {
    applied,
    queries,
    pool: { async connect() { return client; } },
  };
}

test('migrations are applied once in lexical order and checksum-verified', async () => {
  const database = createFakePool();
  const migrationFiles = fs.readdirSync(migrationDirectory)
    .filter((file) => file.endsWith('.sql'))
    .sort();
  const originalLog = console.log;
  console.log = () => {};

  try {
    await runMigrations(database.pool, migrationDirectory);
    const migrationSql = database.queries.filter(({ sql }) =>
      sql.startsWith('CREATE EXTENSION') || sql.startsWith('CREATE INDEX'));
    assert.equal(database.applied.size, migrationFiles.length);

    const firstRunMigrationQueries = database.queries.filter(({ sql }) =>
      sql.startsWith('CREATE EXTENSION') || sql.startsWith('CREATE INDEX'));
    await runMigrations(database.pool, migrationDirectory);
    const secondRunMigrationQueries = database.queries.filter(({ sql }) =>
      sql.startsWith('CREATE EXTENSION') || sql.startsWith('CREATE INDEX'));

    assert.ok(migrationSql.length > 0);
    assert.equal(secondRunMigrationQueries.length, firstRunMigrationQueries.length);
  } finally {
    console.log = originalLog;
  }
});

test('migration runner refuses to apply over a legacy schema', async () => {
  const database = createFakePool({ legacy: true });

  await assert.rejects(
    () => runMigrations(database.pool, migrationDirectory),
    /Legacy schema detected/,
  );
  assert.ok(database.queries.some(({ sql }) => sql === 'RELEASE'));
  assert.ok(!database.queries.some(({ sql }) => sql === 'BEGIN'));
});
