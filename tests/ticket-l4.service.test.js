const assert = require('node:assert/strict');
const test = require('node:test');
const { AppError } = require('../src/errors/AppError');
const { TicketService } = require('../src/services/ticket-l4.service');

test('listTickets normalizes pagination and forwards supported filters', async () => {
  let received;
  const service = new TicketService({
    async list(query) {
      received = query;
      return { items: [], total: 0 };
    },
  });

  const result = await service.listTickets({
    ticket_code: 'BH-900001/2025',
    status: 'MOI',
    center_code: 'TT04',
    category_name: 'MAN_HINH',
    limit: '20',
    offset: '5',
  });

  assert.deepEqual(result, { items: [], total: 0 });
  assert.deepEqual(received, {
    ticketCode: 'BH-900001/2025',
    status: 'MOI',
    centerCode: 'TT04',
    categoryName: 'MAN_HINH',
    limit: 20,
    offset: 5,
  });

  test('listTickets rejects malformed exact ticket filters', async () => {
    const service = new TicketService({ async list() { assert.fail('repository must not run'); } });

    await assert.rejects(
      () => service.listTickets({ ticket_code: 'not-a-ticket' }),
      { statusCode: 422, code: 'VALIDATION_ERROR' },
    );
  });
});

test('listTickets rejects statuses outside the dataset vocabulary', async () => {
  const service = new TicketService({ async list() { assert.fail('repository must not run'); } });

  await assert.rejects(
    () => service.listTickets({ status: 'MOI_TIEP_NHAN' }),
    (error) => error instanceof AppError
      && error.statusCode === 422
      && error.code === 'VALIDATION_ERROR',
  );
});

test('assignTicket trims the actor code and supplies a false overload default', async () => {
  let received;
  const service = new TicketService({
    async assign(input) {
      received = input;
      return { status: 'DA_PHAN_CONG' };
    },
  });

  await service.assignTicket('BH-900001/2025', {
    technician_code: 'KT002',
    assigned_by: ' 8 ',
  });

  assert.deepEqual(received, {
    ticketCode: 'BH-900001/2025',
    technicianCode: 'KT002',
    assignedBy: '8',
    confirmOverload: false,
  });
});

test('assignTicket rejects malformed identifier and request values', async () => {
  const service = new TicketService({ async assign() { assert.fail('repository must not run'); } });

  await assert.rejects(
    () => service.assignTicket('BH0001', {}),
    { statusCode: 422, code: 'VALIDATION_ERROR' },
  );
  await assert.rejects(
    () => service.assignTicket('BH-900001/2025', {
      technician_code: 'KTV-001',
      assigned_by: '',
      confirm_overload: 'yes',
    }),
    (error) => error instanceof AppError
      && error.statusCode === 422
      && Object.keys(error.details).length === 3,
  );
});
