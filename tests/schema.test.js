const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const schema = fs.readFileSync(path.join(root, 'migrations', '001_init.sql'), 'utf8');
const indexes = fs.readFileSync(path.join(root, 'migrations', '002_tickets.sql'), 'utf8');
const ticketCrudMigration = fs.readFileSync(
  path.join(root, 'migrations', '004_ticket_crud.sql'),
  'utf8',
);
const seed = fs.readFileSync(path.join(root, 'seeds', '001_demo.sql'), 'utf8');

test('L4 schema creates exactly six business entities', () => {
  const tables = [...schema.matchAll(/CREATE TABLE IF NOT EXISTS\s+([a-z_]+)/gi)]
    .map((match) => match[1]);

  assert.deepEqual(tables.sort(), [
    'appointment',
    'technician',
    'technician_skill',
    'ticket',
    'ticket_assignment',
    'ticket_status_log',
  ]);
  assert.doesNotMatch(schema, /CREATE TABLE IF NOT EXISTS\s+(service_center|issue_category)\b/i);
  assert.match(indexes, /uq_assignment_current/);
  assert.match(schema, /ex_appointment_no_overlap/);
  assert.match(ticketCrudMigration, /ALTER COLUMN ticket_id SET DEFAULT nextval/);
});

test('schema uses dataset values and preserves the half-open appointment overlap rule', () => {
  for (const status of [
    'MOI',
    'DA_PHAN_CONG',
    'DANG_XU_LY',
    'CHO_LINH_KIEN',
    'HOAN_TAT',
    'DA_DONG',
  ]) {
    assert.ok(schema.includes(`'${status}'`), `missing ticket status ${status}`);
  }
  for (const category of ['MAN_HINH', 'PIN', 'SAC', 'PHAN_MEM', 'NUOC_VAO', 'KHAC']) {
    assert.ok(schema.includes(`'${category}'`), `missing issue category ${category}`);
  }
  assert.match(schema, /tstzrange\(start_at, end_at, '\[\)'\)/);
  assert.match(schema, /WHERE \(status IN \('DA_DAT', 'DA_XAC_NHAN'\)\)/);
});

test('demo seed contains one unassigned ticket and 17 assigned open tickets', () => {
  assert.match(seed, /'BH-900001\/2025'/);
  assert.match(seed, /'MOI'/);
  assert.match(seed, /GENERATE_SERIES\(0, 16\)/);
  assert.match(seed, /'KT002'/);
  assert.match(seed, /DO NOTHING/);
  assert.match(seed, /WHERE NOT EXISTS \(\s*SELECT 1 FROM ticket WHERE ticket_id < 900000\s*\)/);
});
