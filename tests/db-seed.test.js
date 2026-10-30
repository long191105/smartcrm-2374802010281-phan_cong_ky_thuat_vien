const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { runSeeds } = require('../src/db/seed');

const seedDirectory = path.join(__dirname, '..', 'seeds');

test('seed runner can execute twice and wraps each fixture in a transaction', async () => {
  const queries = [];
  const client = {
    async query(sql) {
      queries.push(sql.trim());
      return { rows: [], rowCount: 0 };
    },
    release() {},
  };
  const pool = { async connect() { return client; } };
  const originalLog = console.log;
  console.log = () => {};
  try {
    await runSeeds(pool, seedDirectory);
    await runSeeds(pool, seedDirectory);
  } finally {
    console.log = originalLog;
  }

  assert.equal(queries.filter((query) => query === 'BEGIN').length, 2);
  assert.equal(queries.filter((query) => query === 'COMMIT').length, 2);
  assert.equal(queries.filter((query) => query.includes('INSERT INTO technician (')).length, 2);
});

test('demo fixture uses conflict and existence guards for repeated inserts', () => {
  const seed = fs.readFileSync(
    path.join(seedDirectory, '001_demo.sql'),
    'utf8',
  );
  const inserts = [...seed.matchAll(/INSERT INTO [a-z_]+/gi)];

  assert.ok(inserts.length >= 5);
  assert.equal((seed.match(/ON CONFLICT/gi) || []).length, 4);
  assert.equal((seed.match(/NOT EXISTS/gi) || []).length, 3);
  assert.match(seed, /setval\(\s*'ticket_ticket_id_seq'/i);
});
