const assert = require('node:assert/strict');
const test = require('node:test');
const { AppError } = require('../src/errors/AppError');
const { AppointmentRepository } = require('../src/repositories/appointment.repository');
const { TicketRepository } = require('../src/repositories/ticket.repository');
const { AppointmentService } = require('../src/services/appointment.service');
const { TicketService } = require('../src/services/ticket-l4.service');

const ticketInput = {
  ticket_code: 'BH-900099/2025',
  customer_id: 14159,
  product_id: 21,
  serial_no: 'SN541017338391',
  center_code: 'TT04',
  category_name: 'MAN_HINH',
  priority: 'TRUNG_BINH',
  received_at: '2026-10-20T08:00:00+07:00',
  due_date: '2026-10-23T08:00:00+07:00',
  is_warranty: true,
  created_by: 'manager',
};

test('ticket creation validates dates and maps source fields to the repository', async () => {
  let received;
  const service = new TicketService({
    async createTicket(input) {
      received = input;
      return { ticket_code: input.ticketCode, status: 'MOI' };
    },
  });

  const result = await service.createTicket(ticketInput);

  assert.deepEqual(result, { ticket_code: 'BH-900099/2025', status: 'MOI' });
  assert.deepEqual(received, {
    ticketCode: 'BH-900099/2025',
    customerId: 14159,
    productId: 21,
    serialNo: 'SN541017338391',
    centerCode: 'TT04',
    categoryName: 'MAN_HINH',
    priority: 'TRUNG_BINH',
    issueDesc: '',
    receivedAt: '2026-10-20T08:00:00+07:00',
    dueDate: '2026-10-23T08:00:00+07:00',
    isWarranty: true,
    createdBy: 'manager',
  });
});

test('ticket creation rejects malformed or contradictory input before repository access', async () => {
  const service = new TicketService({
    async createTicket() { assert.fail('repository must not run'); },
  });

  await assert.rejects(
    () => service.createTicket({ ...ticketInput, serial_no: "SN' OR 1=1 --" }),
    (error) => error instanceof AppError
      && error.statusCode === 422
      && Object.hasOwn(error.details, 'serial_no'),
  );
  await assert.rejects(
    () => service.createTicket({
      ...ticketInput,
      due_date: '2026-10-19T08:00:00+07:00',
    }),
    (error) => error instanceof AppError
      && error.statusCode === 422
      && Object.hasOwn(error.details, 'due_date'),
  );
});

test('ticket updates require at least one valid editable field', async () => {
  const service = new TicketService({
    async updateTicket(input) { return input; },
  });

  assert.deepEqual(await service.updateTicket('BH-900099/2025', {
    priority: 'CAO',
  }), {
    ticketCode: 'BH-900099/2025',
    changes: { priority: 'CAO' },
  });
  await assert.rejects(
    () => service.updateTicket('BH-900099/2025', {}),
    { statusCode: 422, code: 'VALIDATION_ERROR' },
  );
});

test('ticket delete is a soft close that preserves its status history', async () => {
  const queries = [];
  const client = {
    async query(sql) {
      const query = sql.trim();
      queries.push(query);
      if (query.startsWith('SELECT ticket_id, status')) {
        return { rows: [{ ticket_id: 12, status: 'MOI' }] };
      }
      if (query.startsWith('SELECT EXISTS')) {
        return { rows: [{ has_history: false }] };
      }
      return { rows: [], rowCount: 1 };
    },
    release() {},
  };
  const repository = new TicketRepository({
    async connect() { return client; },
  });

  const result = await repository.closeTicket({
    ticketCode: 'BH-900099/2025',
    closedBy: 'manager',
    note: 'Tạo nhầm',
  });

  assert.deepEqual(result, {
    ticket_code: 'BH-900099/2025',
    from_status: 'MOI',
    status: 'DA_DONG',
  });
  assert.ok(queries.some((query) => query.includes("SET status = 'DA_DONG'")));
  assert.ok(queries.some((query) => query.startsWith('INSERT INTO ticket_status_log')));
  assert.ok(!queries.some((query) => query.startsWith('DELETE FROM ticket')));
});

test('ticket close rejects records already assigned or scheduled', async () => {
  const queries = [];
  const client = {
    async query(sql) {
      const query = sql.trim();
      queries.push(query);
      if (query.startsWith('SELECT ticket_id, status')) {
        return { rows: [{ ticket_id: 12, status: 'MOI' }] };
      }
      if (query.startsWith('SELECT EXISTS')) {
        return { rows: [{ has_history: true }] };
      }
      return { rows: [], rowCount: 1 };
    },
    release() {},
  };
  const repository = new TicketRepository({
    async connect() { return client; },
  });

  await assert.rejects(
    () => repository.closeTicket({
      ticketCode: 'BH-900099/2025',
      closedBy: 'manager',
      note: '',
    }),
    { statusCode: 409, code: 'TICKET_HAS_HISTORY' },
  );
  assert.ok(queries.includes('ROLLBACK'));
  assert.ok(!queries.some((query) => query.startsWith('UPDATE ticket')));
});

test('appointment update validates the identifier and forwards only editable fields', async () => {
  let received;
  const service = new AppointmentService({
    async update(input) {
      received = input;
      return input;
    },
  });

  const input = {
    appointment_type: 'NHAN_MAY',
    scheduled_start: '2026-10-20T14:00:00+07:00',
    duration_minutes: 45,
    note: 'Gọi trước khi đến',
  };
  assert.deepEqual(await service.update('8', input), {
    appointmentId: 8,
    appointmentType: 'NHAN_MAY',
    startAt: '2026-10-20T14:00:00+07:00',
    durationMinutes: 45,
    note: 'Gọi trước khi đến',
  });
  assert.equal(received.appointmentId, 8);
  await assert.rejects(
    () => service.update('0', input),
    { statusCode: 422, code: 'VALIDATION_ERROR' },
  );
});

test('appointment update checks the active reservation and retains its row', async () => {
  const queries = [];
  const client = {
    async query(sql) {
      const query = sql.trim();
      queries.push(query);
      if (query.startsWith('SELECT appointment_id, technician_id')) {
        return {
          rows: [{
            appointment_id: 8,
            technician_id: 2,
            start_at: new Date('2026-10-20T07:00:00.000Z'),
            end_at: new Date('2026-10-20T08:00:00.000Z'),
            appointment_type: 'GIAO_MAY',
            status: 'DA_DAT',
            note: null,
          }],
        };
      }
      if (query.startsWith('SELECT appointment_id, start_at')) {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 1 };
    },
    release() {},
  };
  const repository = new AppointmentRepository({
    async connect() { return client; },
    async query() {
      return {
        rowCount: 1,
        rows: [{
          appointment_id: 8,
          status: 'DA_DAT',
          appointment_type: 'NHAN_MAY',
        }],
      };
    },
  });

  const result = await repository.update({
    appointmentId: 8,
    appointmentType: 'NHAN_MAY',
    startAt: '2026-10-20T08:00:00.000Z',
    durationMinutes: 60,
    note: '',
  });

  assert.equal(result.appointment_type, 'NHAN_MAY');
  assert.ok(queries.some((query) => query.includes('appointment_id <> $2')));
  assert.ok(queries.some((query) => query.startsWith('UPDATE appointment')));
  assert.ok(!queries.some((query) => query.startsWith('DELETE FROM appointment')));
});

test('appointment delete cancels only active appointments and preserves the record', async () => {
  const queries = [];
  const client = {
    async query(sql) {
      const query = sql.trim();
      queries.push(query);
      if (query.startsWith('SELECT appointment_id, status')) {
        return { rows: [{ appointment_id: 8, status: 'DA_DAT' }] };
      }
      return { rows: [], rowCount: 1 };
    },
    release() {},
  };
  const repository = new AppointmentRepository({
    async connect() { return client; },
  });

  assert.deepEqual(await repository.cancel(8), {
    appointment_id: 8,
    status: 'KHACH_HUY',
  });
  assert.ok(queries.some((query) => query.includes("SET status = 'KHACH_HUY'")));
  assert.ok(!queries.some((query) => query.startsWith('DELETE FROM appointment')));
});
