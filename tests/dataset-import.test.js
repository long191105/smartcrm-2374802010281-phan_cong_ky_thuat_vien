const assert = require('node:assert/strict');
const test = require('node:test');
const { parseCsv } = require('../src/db/import-dataset');

test('CSV parser preserves escaped quotes, commas and embedded line breaks', () => {
  const rows = parseCsv(
    'id,description\r\n1,"contains, comma and ""quoted text""\r\ncontinued"\r\n',
    'fixture.csv',
  );

  assert.deepEqual(rows, [{
    id: '1',
    description: 'contains, comma and "quoted text"\r\ncontinued',
  }]);
});

test('CSV parser rejects malformed quoted records and mismatched columns', () => {
  assert.throws(
    () => parseCsv('id,name\n1,"not closed', 'broken.csv'),
    /unterminated quoted CSV field/,
  );
  assert.throws(
    () => parseCsv('id,name\n1', 'short.csv'),
    /expected 2/,
  );
});
