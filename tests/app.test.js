const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { createApp } = require('../src/app');
const { TicketService } = require('../src/services/ticket-l4.service');

const testUser = { username: 'manager', displayName: 'Test Manager' };
const authService = {
  async login() {
    return { sessionToken: 'a'.repeat(64), user: testUser };
  },
  async authenticateSession(token) {
    return token === 'test-session' ? testUser : null;
  },
  async logout() {},
};
const sessionHeaders = { cookie: 'smartcrm_session=test-session' };
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
    async getHistory(ticketCode) {
      return { items: [{ ticket_code: ticketCode }] };
    },
    async updateStatus(ticketCode, body) {
      return { ticket_code: ticketCode, status: body.status };
    },
  };
  const technicianService = {
    async list(query) {
      ticketServiceCalls.push({ method: 'technicians', query });
      return { items: [], total: 0 };
    },
    async listAssignedTickets(technicianCode, query) {
      ticketServiceCalls.push({ method: 'work', technicianCode, query });
      return { items: [], total: 0 };
    },
  };
  const appointmentService = {
    async list(query) {
      ticketServiceCalls.push({ method: 'appointments', query });
      return { items: [], total: 0 };
    },
    async create(body) {
      ticketServiceCalls.push({ method: 'appointment-create', body });
      return { appointment_id: 1, ...body };
    },
  };
  server = createApp({
    pool, ticketService, technicianService, appointmentService, authService,
  }).listen(0);
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
    error: 'DATABASE_UNAVAILABLE',
    message: 'Cơ sở dữ liệu hiện không khả dụng.',
    fields: {},
  });
  databaseAvailable = true;
});

test('business APIs require a valid authenticated session', async () => {
  const response = await fetch(`${baseUrl}/api/tickets`);

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: 'UNAUTHORIZED',
    message: 'Vui lòng đăng nhập để tiếp tục.',
    fields: {},
  });
  assert.equal(ticketServiceCalls.length, 0);
});

test('expired sessions are rejected and their cookies are cleared', async () => {
  const response = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { cookie: 'smartcrm_session=expired-session' },
  });

  assert.equal(response.status, 401);
  assert.match(response.headers.get('set-cookie'), /Expires=/i);
  assert.equal((await response.json()).error, 'UNAUTHORIZED');
});

test('login establishes an HttpOnly session and exposes the authenticated user', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'manager', password: 'not-returned' }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { user: testUser });
  assert.match(response.headers.get('set-cookie'), /smartcrm_session=/);
  assert.match(response.headers.get('set-cookie'), /HttpOnly/i);
  assert.match(response.headers.get('set-cookie'), /SameSite=Lax/i);
});

test('session endpoint returns the authenticated user and logout clears the cookie', async () => {
  const currentUser = await fetch(`${baseUrl}/api/auth/me`, { headers: sessionHeaders });
  assert.equal(currentUser.status, 200);
  assert.deepEqual(await currentUser.json(), { user: testUser });

  const logout = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: sessionHeaders,
  });
  assert.equal(logout.status, 204);
  assert.match(logout.headers.get('set-cookie'), /Expires=/i);
});

test('unknown routes return a JSON 404 response', async () => {
  const response = await fetch(`${baseUrl}/not-found`);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: 'NOT_FOUND',
    message: 'Không tìm thấy tài nguyên.',
    fields: {},
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
    error: 'INVALID_JSON',
    message: 'Nội dung JSON không hợp lệ.',
    fields: {},
  });
});

test('GET /api/tickets forwards filters and returns the list contract', async () => {
  const response = await fetch(`${baseUrl}/api/tickets?status=MOI&center_code=TT04`, {
    headers: sessionHeaders,
  });

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
      headers: { 'content-type': 'application/json', ...sessionHeaders },
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
    authService,
  }).listen(0);
  await new Promise((resolve) => validationServer.once('listening', resolve));

  try {
    const response = await fetch(
      `http://127.0.0.1:${validationServer.address().port}/api/tickets/invalid/assignment`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...sessionHeaders },
        body: '{}',
      },
    );
    assert.equal(response.status, 422);
    assert.deepEqual(await response.json(), {
      error: 'VALIDATION_ERROR',
      message: 'Dữ liệu không hợp lệ.',
      fields: { ticket_code: 'Mã phiếu không hợp lệ.' },
    });
  } finally {
    await new Promise((resolve, reject) => {
      validationServer.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('technician, assigned-work and appointment endpoints use live service contracts', async () => {
  const technicians = await fetch(`${baseUrl}/api/technicians?center_code=TT04`, {
    headers: sessionHeaders,
  });
  assert.equal(technicians.status, 200);
  assert.deepEqual(await technicians.json(), { items: [], total: 0 });
  assert.deepEqual(ticketServiceCalls.at(-1), {
    method: 'technicians',
    query: { center_code: 'TT04' },
  });

  const work = await fetch(`${baseUrl}/api/technicians/KT002/tickets?status=DANG_XU_LY`, {
    headers: sessionHeaders,
  });
  assert.equal(work.status, 200);
  assert.deepEqual(ticketServiceCalls.at(-1), {
    method: 'work',
    technicianCode: 'KT002',
    query: { status: 'DANG_XU_LY' },
  });

  const appointments = await fetch(`${baseUrl}/api/appointments?date=2026-10-20`, {
    headers: sessionHeaders,
  });
  assert.equal(appointments.status, 200);
  assert.deepEqual(ticketServiceCalls.at(-1), {
    method: 'appointments',
    query: { date: '2026-10-20' },
  });
});
