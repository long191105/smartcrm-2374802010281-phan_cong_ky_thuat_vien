const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { createApp } = require('../src/app');
const { TicketService } = require('../src/services/ticket-l4.service');

let server;
let baseUrl;
let databaseAvailable = true;
let queryCount = 0;
const ticketServiceCalls = [];

before(async () => {
  const pool = {
    async query(sql) {
      queryCount += 1;
      assert.equal(sql, 'SELECT 1');
      if (!databaseAvailable) {
        throw new Error('database unavailable');
      }
      return { rows: [{ '?column?': 1 }] };
    },
  };
  const ticketService = {
    async listTickets(query) {
      ticketServiceCalls.push({ method: 'list', query });
      return { items: [], total: 0 };
    },
    async assignTicket(ticketCode, body) {
      ticketServiceCalls.push({ method: 'assign', ticketCode, body });
      return {
        ticket_code: ticketCode,
        status: 'DA_PHAN_CONG',
        technician_code: body.technician_code,
      };
    },
  };
  server = createApp({ pool, ticketService }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('GET /health is a liveness check and does not require the database', async () => {
  databaseAvailable = false;
  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
  assert.equal(queryCount, 0);
  databaseAvailable = true;
});

test('GET /health/ready checks database connectivity', async () => {
  const response = await fetch(`${baseUrl}/health/ready`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: 'ok',
    database: 'connected',
  });
  assert.equal(queryCount, 1);
});

test('GET /health/ready returns 503 when the database is unavailable', async () => {
  databaseAvailable = false;
  const response = await fetch(`${baseUrl}/health/ready`);

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error_code: 'DATABASE_UNAVAILABLE',
    message: 'Cơ sở dữ liệu hiện không khả dụng.',
  });
  databaseAvailable = true;
});

test('unknown routes return a JSON 404 response', async () => {
  const response = await fetch(`${baseUrl}/not-found`);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error_code: 'NOT_FOUND',
    message: 'Không tìm thấy tài nguyên.',
  });
});

test('malformed JSON is reported as a client error', async () => {
  const response = await fetch(`${baseUrl}/health`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{',
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error_code: 'INVALID_JSON',
    message: 'Nội dung JSON không hợp lệ.',
  });
});

test('GET /api/tickets forwards filters and returns the list contract', async () => {
  const response = await fetch(`${baseUrl}/api/tickets?status=MOI&center_code=TT04`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { items: [], total: 0 });
  assert.deepEqual(ticketServiceCalls.at(-1), {
    method: 'list',
    query: { status: 'MOI', center_code: 'TT04' },
  });
});

test('POST assignment accepts an encoded ticket code containing a slash', async () => {
  const response = await fetch(
    `${baseUrl}/api/tickets/BH-900001%2F2025/assignment`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        technician_code: 'KT002',
        assigned_by: '8',
        confirm_overload: true,
      }),
    },
  );

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    ticket_code: 'BH-900001/2025',
    status: 'DA_PHAN_CONG',
    technician_code: 'KT002',
  });
  assert.deepEqual(ticketServiceCalls.at(-1), {
    method: 'assign',
    ticketCode: 'BH-900001/2025',
    body: {
      technician_code: 'KT002',
      assigned_by: '8',
      confirm_overload: true,
    },
  });
});

test('assignment input errors use the documented JSON error format', async () => {
  const validationServer = createApp({
    pool: { async query() { return { rows: [] }; } },
    ticketService: new TicketService({}),
  }).listen(0);
  await new Promise((resolve) => validationServer.once('listening', resolve));

  try {
    const response = await fetch(
      `http://127.0.0.1:${validationServer.address().port}/api/tickets/invalid/assignment`,
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' },
    );
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error_code: 'VALIDATION_ERROR',
      message: 'ticket_code không hợp lệ.',
    });
  } finally {
    await new Promise((resolve, reject) => {
      validationServer.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
