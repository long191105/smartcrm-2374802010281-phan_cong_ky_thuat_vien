const assert = require('node:assert/strict');
const test = require('node:test');
const { AppError } = require('../src/errors/AppError');
const { TicketRepository } = require('../src/repositories/ticket.repository');

function createDatabase({ workload = 0, ticketStatus = 'MOI' } = {}) {
  const queries = [];
  const client = {
    async query(sql, values = []) {
      const query = sql.trim();
      queries.push({ sql: query, values });

      if (query.startsWith('SELECT ticket_id, ticket_code')) {
        return {
          rows: [{
            ticket_id: 900001,
            ticket_code: 'BH-900001/2025',
            center_code: 'TT04',
            category_name: 'MAN_HINH',
            status: ticketStatus,
          }],
        };
      }
      if (query.startsWith('SELECT technician_id, technician_code')) {
        return {
          rows: [{
            technician_id: 2,
            technician_code: 'KT002',
            full_name: 'Trần Hoài Giang',
            center_code: 'TT04',
            is_active: true,
          }],
        };
      }
      if (query.startsWith('SELECT 1 FROM technician_skill')) {
        return { rowCount: 1, rows: [{ '?column?': 1 }] };
      }
      if (query.startsWith('SELECT COUNT(*)::INTEGER AS open_tickets')) {
        return { rows: [{ open_tickets: workload }] };
      }
      if (query.startsWith('INSERT INTO ticket_assignment')) {
        return { rows: [{ assigned_at: '2026-10-19T16:30:00.000Z' }] };
      }
      return { rows: [], rowCount: 1 };
    },
    release() {
      queries.push({ sql: 'RELEASE', values: [] });
    },
  };

  return {
    queries,
    pool: { async connect() { return client; } },
  };
}

test('list returns an accurate total even when the requested page is empty', async () => {
  let queryText;
  let queryValues;
  const repository = new TicketRepository({
    async query(sql, values) {
      queryText = sql;
      queryValues = values;
      return { rows: [{ ticket_id: null, total: 18 }] };
    },
  });

  const result = await repository.list({
    status: 'MOI',
    centerCode: 'TT04',
    categoryName: 'MAN_HINH',
    limit: 10,
    offset: 50,
  });

  assert.deepEqual(result, { items: [], total: 18 });
  assert.deepEqual(queryValues, ['MOI', 'TT04', 'MAN_HINH', 10, 50]);
  assert.match(queryText, /LEFT JOIN page ON TRUE/);
  assert.match(queryText, /t\.status = \$1 AND t\.center_code = \$2 AND t\.category_name = \$3/);
});

test('assignment is atomic and writes status and assignment history', async () => {
  const database = createDatabase();
  const repository = new TicketRepository(database.pool);

  const result = await repository.assign({
    ticketCode: 'BH-900001/2025',
    technicianCode: 'KT002',
    assignedBy: '8',
    confirmOverload: false,
  });

  assert.deepEqual(result, {
    ticket_code: 'BH-900001/2025',
    status: 'DA_PHAN_CONG',
    technician_code: 'KT002',
    assigned_by: '8',
    assigned_at: '2026-10-19T16:30:00.000Z',
  });
  assert.ok(database.queries.some(({ sql }) => sql.startsWith('UPDATE ticket')));
  assert.ok(database.queries.some(({ sql }) => sql.startsWith('INSERT INTO ticket_status_log')));
  assert.equal(database.queries.at(-2).sql, 'COMMIT');
  assert.equal(database.queries.at(-1).sql, 'RELEASE');
});

test('assignment requires explicit confirmation above workload threshold', async () => {
  const database = createDatabase({ workload: 17 });
  const repository = new TicketRepository(database.pool);

  await assert.rejects(
    () => repository.assign({
      ticketCode: 'BH-900001/2025',
      technicianCode: 'KT002',
      assignedBy: '8',
      confirmOverload: false,
    }),
    (error) => error instanceof AppError
      && error.statusCode === 409
      && error.code === 'OVERLOAD_CONFIRMATION_REQUIRED'
      && error.details.open_tickets === 17,
  );
  assert.ok(database.queries.some(({ sql }) => sql === 'ROLLBACK'));
  assert.ok(!database.queries.some(({ sql }) => sql.startsWith('INSERT INTO ticket_assignment')));
});

test('assignment is permitted after the manager confirms an overloaded technician', async () => {
  const database = createDatabase({ workload: 17 });
  const repository = new TicketRepository(database.pool);

  const result = await repository.assign({
    ticketCode: 'BH-900001/2025',
    technicianCode: 'KT002',
    assignedBy: '8',
    confirmOverload: true,
  });

  assert.equal(result.status, 'DA_PHAN_CONG');
  assert.ok(database.queries.some(({ sql }) => sql === 'COMMIT'));
});

test('assignment rejects a ticket that is no longer waiting', async () => {
  const database = createDatabase({ ticketStatus: 'DA_PHAN_CONG' });
  const repository = new TicketRepository(database.pool);

  await assert.rejects(
    () => repository.assign({
      ticketCode: 'BH-900001/2025',
      technicianCode: 'KT002',
      assignedBy: '8',
      confirmOverload: true,
    }),
    { statusCode: 409, code: 'TICKET_NOT_ASSIGNABLE' },
  );
  assert.ok(database.queries.some(({ sql }) => sql === 'ROLLBACK'));
});
