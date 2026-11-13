const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadConfig } = require('../src/config');

const validEnvironment = {
  DB_HOST: 'db',
  DB_NAME: 'smartcrm',
  DB_USER: 'postgres',
  DB_PASSWORD: 'example-password',
  AUTH_BOOTSTRAP_USERNAME: 'manager',
  AUTH_BOOTSTRAP_PASSWORD: 'example-password',
  AUTH_BOOTSTRAP_DISPLAY_NAME: 'Demo Manager',
};

test('configuration requires named database and demo-account variables without exposing values', () => {
  assert.throws(
    () => loadConfig({ DB_PASSWORD: 'do-not-print-this' }),
    (error) => {
      assert.match(error.message, /DB_HOST/);
      assert.match(error.message, /AUTH_BOOTSTRAP_USERNAME/);
      assert.doesNotMatch(error.message, /do-not-print-this/);
      return true;
    },
  );
});

test('configuration accepts a database URL and defaults the app port to 3000', () => {
  const { port } = loadConfig({
    DATABASE_URL: 'postgres://example',
    AUTH_BOOTSTRAP_USERNAME: 'manager',
    AUTH_BOOTSTRAP_PASSWORD: 'example-password',
    AUTH_BOOTSTRAP_DISPLAY_NAME: 'Demo Manager',
  });

  assert.equal(port, 3000);
});

test('configuration rejects an invalid app port', () => {
  assert.throws(
    () => loadConfig({ ...validEnvironment, APP_PORT: '70000' }),
    /APP_PORT must be an integer between 1 and 65535/,
  );
});

test('configuration rejects a weak bootstrap password before database initialization', () => {
  assert.throws(
    () => loadConfig({ ...validEnvironment, AUTH_BOOTSTRAP_PASSWORD: 'short' }),
    /AUTH_BOOTSTRAP_PASSWORD must contain 12 to 128 characters/,
  );
});
