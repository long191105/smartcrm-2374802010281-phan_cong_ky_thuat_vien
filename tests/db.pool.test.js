const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createPool } = require('../src/db/pool');

test('idle client errors are handled without logging error details', async (t) => {
  const log = t.mock.method(console, 'error');
  const pool = createPool({ DATABASE_URL: 'postgres://localhost/test' });

  try {
    assert.doesNotThrow(() => {
      pool.emit('error', new Error('password=must-not-be-logged'));
    });
    assert.deepEqual(
      log.mock.calls.map((call) => call.arguments),
      [['Unexpected database pool error.']],
    );
  } finally {
    await pool.end();
  }
});
