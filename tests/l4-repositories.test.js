const assert = require('node:assert/strict');
const test = require('node:test');
const { AppointmentRepository } = require('../src/repositories/appointment.repository');

function createAppointmentDatabase({ conflict = false } = {}) {
  const queries = [];
  const client = {
    async query(sql, values = []) {
      const query = sql.trim();
      queries.push({ query, values });
      if (query.startsWith('SELECT ticket.ticket_id')) {
        return {
          rows: [{
            ticket_id: 900001,
            center_code: 'TT04',
            status: 'DA_PHAN_CONG',
            technician_id: 2,
            technician_code: 'KT002',
          }],
        };
      }
      if (query.startsWith('SELECT ticket.ticket_code')) {
        return conflict
          ? { rowCount: 1, rows: [{ ticket_code: 'BH-900002/2025', start_at: new Date() }] }
          : { rowCount: 0, rows: [] };
      }
      if (query.startsWith('INSERT INTO appointment')) {
        return {
          rows: [{
            appointment_id: 8,
            start_at: new Date('2026-10-20T07:00:00.000Z'),
            end_at: new Date('2026-10-20T08:00:00.000Z'),
            status: 'DA_DAT',
          }],
        };
      }
      return { rows: [], rowCount: 1 };
    },
    release() {},
  };
  return {
    queries,
    pool: { async connect() { return client; } },
  };
}

test('appointment creation uses assigned technician and commits the selected slot', async () => {
  const database = createAppointmentDatabase();
  const repository = new AppointmentRepository(database.pool);

  const result = await repository.create({
    ticketCode: 'BH-900001/2025',
    appointmentType: 'NHAN_MAY',
    startAt: '2026-10-20T07:00:00.000Z',
    durationMinutes: 60,
    note: 'Gọi trước khi đến',
  });

  assert.deepEqual(result, {
    appointment_id: 8,
    start_at: new Date('2026-10-20T07:00:00.000Z'),
    end_at: new Date('2026-10-20T08:00:00.000Z'),
    status: 'DA_DAT',
    ticket_code: 'BH-900001/2025',
    technician_code: 'KT002',
    center_code: 'TT04',
    appointment_type: 'NHAN_MAY',
  });
  assert.equal(database.queries.at(-1).query, 'COMMIT');
  assert.ok(database.queries.some(({ query }) => query.startsWith('SELECT ticket.ticket_code')));
});

test('appointment creation rolls back when the technician already has an overlapping slot', async () => {
  const database = createAppointmentDatabase({ conflict: true });
  const repository = new AppointmentRepository(database.pool);

  await assert.rejects(
    () => repository.create({
      ticketCode: 'BH-900001/2025',
      appointmentType: 'NHAN_MAY',
      startAt: '2026-10-20T07:00:00.000Z',
      durationMinutes: 60,
      note: '',
    }),
    { statusCode: 409, code: 'APPOINTMENT_CONFLICT' },
  );
  assert.ok(database.queries.some(({ query }) => query === 'ROLLBACK'));
  assert.ok(!database.queries.some(({ query }) => query.startsWith('INSERT INTO appointment')));
});
