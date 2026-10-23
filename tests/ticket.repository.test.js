const assert = require('node:assert/strict');
const test = require('node:test');
const { AppError } = require('../src/errors/AppError');
const { TicketRepository } = require('../src/repositories/ticket.repository');

function createDatabase({ workload = 0, ticketStatus = 'MOI', proficiency = 3 } = {}) {
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
      if (query.startsWith('SELECT proficiency')) {
        return { rowCount: 1, rows: [{ proficiency }] };
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
    ticketCode: 'BH-900001/2025',
    status: 'MOI',
    centerCode: 'TT04',
    categoryName: 'MAN_HINH',
    limit: 10,
    offset: 50,
  });

  assert.deepEqual(result, { items: [], total: 18 });
  assert.deepEqual(queryValues, ['BH-900001/2025', 'MOI', 'TT04', 'MAN_HINH', 10, 50]);
  assert.match(queryText, /LEFT JOIN page ON TRUE/);
  assert.match(queryText, /t\.ticket_code = \$1 AND t\.status = \$2 AND t\.center_code = \$3 AND t\.category_name = \$4/);
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

test('assignment rejects a technician below the minimum skill proficiency', async () => {
  const database = createDatabase({ proficiency: 2 });
  const repository = new TicketRepository(database.pool);

  await assert.rejects(
    () => repository.assign({
      ticketCode: 'BH-900001/2025',
      technicianCode: 'KT002',
      assignedBy: '8',
      confirmOverload: true,
    }),
    { statusCode: 409, code: 'SKILL_MISMATCH' },
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

test('status changes verify the current technician and write history atomically', async () => {
  const queries = [];
  const client = {
    async query(sql, values = []) {
      const query = sql.trim();
      queries.push({ query, values });
      if (query.startsWith('SELECT ticket.ticket_id')) {
        return { rows: [{ ticket_id: 900001, status: 'DA_PHAN_CONG', technician_code: 'KT002' }] };
      }
      return { rows: [], rowCount: 1 };
    },
    release() {},
  };
  const repository = new TicketRepository({ async connect() { return client; } });

  const result = await repository.updateStatus({
    ticketCode: 'BH-900001/2025',
    status: 'DANG_XU_LY',
    changedBy: 'KT002',
    note: 'Bắt đầu kiểm tra',
  });

  assert.deepEqual(result, {
    ticket_code: 'BH-900001/2025',
    from_status: 'DA_PHAN_CONG',
    status: 'DANG_XU_LY',
    changed_by: 'KT002',
  });
  assert.ok(queries.some(({ query }) => query.startsWith('UPDATE ticket')));
  assert.ok(queries.some(({ query }) => query.startsWith('INSERT INTO ticket_status_log')));
  assert.equal(queries.at(-1).query, 'COMMIT');
});

test('status changes reject an invalid transition before updating the ticket', async () => {
  const queries = [];
  const client = {
    async query(sql) {
      const query = sql.trim();
      queries.push(query);
      if (query.startsWith('SELECT ticket.ticket_id')) {
        return { rows: [{ ticket_id: 900001, status: 'DA_PHAN_CONG', technician_code: 'KT002' }] };
      }
      return { rows: [], rowCount: 1 };
    },
    release() {},
  };
  const repository = new TicketRepository({ async connect() { return client; } });

  await assert.rejects(
    () => repository.updateStatus({
      ticketCode: 'BH-900001/2025',
      status: 'HOAN_TAT',
      changedBy: 'KT002',
      note: '',
    }),
    { statusCode: 409, code: 'INVALID_STATUS_TRANSITION' },
  );
  assert.ok(queries.includes('ROLLBACK'));
  assert.ok(!queries.some((query) => query.startsWith('UPDATE ticket')));
});
