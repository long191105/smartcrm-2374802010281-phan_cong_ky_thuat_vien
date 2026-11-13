const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { createApp } = require('../src/app');
const { TicketRepository } = require('../src/repositories/ticket.repository');
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
    async createTicket(body) {
      ticketServiceCalls.push({ method: 'ticket-create', body });
      return { ticket_code: body.ticket_code, status: 'MOI' };
    },
    async listTickets(query) {
      ticketServiceCalls.push({ method: 'list', query });
      return { items: [], total: 0 };
    },
    async getTicket(ticketCode) {
      ticketServiceCalls.push({ method: 'ticket-get', ticketCode });
      return { ticket_code: ticketCode, status: 'MOI' };
    },
    async updateTicket(ticketCode, body) {
      ticketServiceCalls.push({ method: 'ticket-update', ticketCode, body });
      return { ticket_code: ticketCode, ...body };
    },
    async closeTicket(ticketCode, body) {
      ticketServiceCalls.push({ method: 'ticket-close', ticketCode, body });
      return { ticket_code: ticketCode, status: 'DA_DONG' };
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
    async get(appointmentId) {
      ticketServiceCalls.push({ method: 'appointment-get', appointmentId });
      return { appointment_id: Number(appointmentId), status: 'DA_DAT' };
    },
    async update(appointmentId, body) {
      ticketServiceCalls.push({ method: 'appointment-update', appointmentId, body });
      return { appointment_id: Number(appointmentId), ...body };
    },
    async cancel(appointmentId) {
      ticketServiceCalls.push({ method: 'appointment-cancel', appointmentId });
      return { appointment_id: Number(appointmentId), status: 'KHACH_HUY' };
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

test('GET /health confirms the database is available', async () => {
  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', db: 'up' });
  assert.equal(queryCount, 1);
});

test('GET /health returns 503 when the database is unavailable', async () => {
  databaseAvailable = false;
  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: 'error', db: 'down' });
  databaseAvailable = true;
});

test('GET /health/ready checks database connectivity', async () => {
  const response = await fetch(`${baseUrl}/health/ready`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: 'ok',
    database: 'connected',
  });
  assert.equal(queryCount, 3);
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
  assert.equal(response.headers.get('x-powered-by'), null);
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

test('oversized JSON requests return 413 instead of an internal server error', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ data: 'x'.repeat(1024 * 1024) }),
  });

  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), {
    error: 'PAYLOAD_TOO_LARGE',
    message: 'Nội dung gửi lên vượt giới hạn cho phép.',
    fields: {},
  });
});

test('GET /api/tickets forwards filters and returns the list contract', async () => {
  const response = await fetch(`${baseUrl}/api/tickets?status=MOI&center_code=TT04&ticket_code=BH-900001%2F2025`, {
    headers: sessionHeaders,
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { items: [], total: 0 });
  assert.deepEqual(ticketServiceCalls.at(-1), {
    method: 'list',
    query: { status: 'MOI', center_code: 'TT04', ticket_code: 'BH-900001/2025' },
  });
});

test('ticket collection and item routes expose create, read, update, and safe close operations', async () => {
  const created = await fetch(`${baseUrl}/api/tickets`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...sessionHeaders },
    body: JSON.stringify({ ticket_code: 'BH-900099/2025' }),
  });
  assert.equal(created.status, 201);
  assert.deepEqual(await created.json(), {
    ticket_code: 'BH-900099/2025',
    status: 'MOI',
  });
  assert.equal(ticketServiceCalls.at(-1).method, 'ticket-create');

  const code = encodeURIComponent('BH-900099/2025');
  const read = await fetch(`${baseUrl}/api/tickets/${code}`, { headers: sessionHeaders });
  assert.equal(read.status, 200);
  assert.deepEqual(await read.json(), { ticket_code: 'BH-900099/2025', status: 'MOI' });

  const updated = await fetch(`${baseUrl}/api/tickets/${code}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...sessionHeaders },
    body: JSON.stringify({ priority: 'CAO' }),
  });
  assert.equal(updated.status, 200);
  assert.deepEqual(await updated.json(), { ticket_code: 'BH-900099/2025', priority: 'CAO' });

  const closed = await fetch(`${baseUrl}/api/tickets/${code}`, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json', ...sessionHeaders },
    body: JSON.stringify({ closed_by: 'manager' }),
  });
  assert.equal(closed.status, 200);
  assert.deepEqual(await closed.json(), { ticket_code: 'BH-900099/2025', status: 'DA_DONG' });
  assert.equal(ticketServiceCalls.at(-1).method, 'ticket-close');
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
  let createCalls = 0;
  const validationServer = createApp({
    pool: { async query() { return { rows: [] }; } },
    ticketService: new TicketService({
      async createTicket() {
        createCalls += 1;
        assert.fail('invalid input must not reach the repository');
      },
    }),
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

    const invalidCreate = await fetch(
      `http://127.0.0.1:${validationServer.address().port}/api/tickets`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...sessionHeaders },
        body: JSON.stringify({}),
      },
    );
    assert.equal(invalidCreate.status, 422);
    const createError = await invalidCreate.json();
    assert.equal(createError.error, 'VALIDATION_ERROR');
    assert.ok(Object.hasOwn(createError.fields, 'ticket_code'));
    assert.equal(createCalls, 0);
  } finally {
    await new Promise((resolve, reject) => {
      validationServer.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('HTTP status update rejects a different assigned technician without side effects', async () => {
  const queries = [];
  const client = {
    async query(sql) {
      const query = sql.trim();
      queries.push(query);
      if (query.startsWith('SELECT ticket.ticket_id')) {
        return {
          rows: [{
            ticket_id: 900001,
            status: 'DA_PHAN_CONG',
            technician_code: 'KT002',
          }],
        };
      }
      return { rows: [], rowCount: 1 };
    },
    release() {},
  };
  const statusServer = createApp({
    pool: {
      async query() { return { rows: [] }; },
      async connect() { return client; },
    },
    ticketService: new TicketService(new TicketRepository({ async connect() { return client; } })),
    authService,
  }).listen(0);
  await new Promise((resolve) => statusServer.once('listening', resolve));

  try {
    const response = await fetch(
      `http://127.0.0.1:${statusServer.address().port}/api/tickets/BH-900001%2F2025/status`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', ...sessionHeaders },
        body: JSON.stringify({ status: 'DANG_XU_LY', changed_by: 'KT999' }),
      },
    );

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), {
      error: 'FORBIDDEN',
      message: 'Chỉ kỹ thuật viên đang phụ trách mới được cập nhật phiếu.',
      fields: {},
    });
    assert.ok(queries.includes('ROLLBACK'));
    assert.ok(!queries.some((query) => query.startsWith('UPDATE ticket')));
    assert.ok(!queries.some((query) => query.startsWith('INSERT INTO ticket_status_log')));
  } finally {
    await new Promise((resolve, reject) => {
      statusServer.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('HTTP ticket lookup returns a sanitized 404 for a valid but missing ticket code', async () => {
  const missingTicketServer = createApp({
    pool: {
      async query() {
        return { rows: [{ ticket_id: null, total: 0 }] };
      },
    },
    ticketService: new TicketService(new TicketRepository({
      async query() {
        return { rows: [{ ticket_id: null, total: 0 }] };
      },
    })),
    authService,
  }).listen(0);
  await new Promise((resolve) => missingTicketServer.once('listening', resolve));

  try {
    const response = await fetch(
      `http://127.0.0.1:${missingTicketServer.address().port}/api/tickets/BH-900099%2F2025`,
      { headers: sessionHeaders },
    );

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      error: 'NOT_FOUND',
      message: 'Không tìm thấy phiếu bảo hành.',
      fields: {},
    });
  } finally {
    await new Promise((resolve, reject) => {
      missingTicketServer.close((error) => (error ? reject(error) : resolve()));
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

  const appointment = await fetch(`${baseUrl}/api/appointments/8`, { headers: sessionHeaders });
  assert.equal(appointment.status, 200);
  assert.deepEqual(await appointment.json(), { appointment_id: 8, status: 'DA_DAT' });

  const updatedAppointment = await fetch(`${baseUrl}/api/appointments/8`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...sessionHeaders },
    body: JSON.stringify({ note: 'Gọi trước khi đến' }),
  });
  assert.equal(updatedAppointment.status, 200);
  assert.equal(ticketServiceCalls.at(-1).method, 'appointment-update');

  const cancelledAppointment = await fetch(`${baseUrl}/api/appointments/8`, {
    method: 'DELETE',
    headers: sessionHeaders,
  });
  assert.equal(cancelledAppointment.status, 200);
  assert.deepEqual(await cancelledAppointment.json(), {
    appointment_id: 8,
    status: 'KHACH_HUY',
  });
});
