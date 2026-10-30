const assert = require('node:assert/strict');
const test = require('node:test');
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
  created_by: 'manager',
};

test('createTicket creates an MOI ticket from normalized L4 fields', async () => {
  let received;
  const service = new TicketService({
    async createTicket(input) {
      received = input;
      return { ticket_code: input.ticketCode, status: 'MOI' };
    },
  });

  assert.deepEqual(await service.createTicket(ticketInput), {
    ticket_code: 'BH-900099/2025',
    status: 'MOI',
  });
  assert.equal(received.ticketCode, ticketInput.ticket_code);
  assert.equal(received.isWarranty, true);
  assert.equal(received.issueDesc, '');
});

test('getTicket validates its identifier before reading from the repository', async () => {
  let received;
  const service = new TicketService({
    async getTicket(ticketCode) {
      received = ticketCode;
      return { ticket_code: ticketCode };
    },
  });

  await service.getTicket('BH-900099/2025');
  assert.equal(received, 'BH-900099/2025');
  await assert.rejects(
    () => service.getTicket('invalid'),
    { statusCode: 422, code: 'VALIDATION_ERROR' },
  );
});

test('updateTicket forwards validated fields without accepting workflow status changes', async () => {
  let received;
  const service = new TicketService({
    async updateTicket(input) {
      received = input;
      return input;
    },
  });

  await service.updateTicket('BH-900099/2025', { priority: 'CAO' });
  assert.deepEqual(received, {
    ticketCode: 'BH-900099/2025',
    changes: { priority: 'CAO' },
  });
  await assert.rejects(
    () => service.updateTicket('BH-900099/2025', { status: 'HOAN_TAT' }),
    { statusCode: 422, code: 'VALIDATION_ERROR' },
  );
});

test('closeTicket validates the audit actor and note', async () => {
  let received;
  const service = new TicketService({
    async closeTicket(input) {
      received = input;
      return input;
    },
  });

  await service.closeTicket('BH-900099/2025', { closed_by: ' manager ' });
  assert.deepEqual(received, {
    ticketCode: 'BH-900099/2025',
    closedBy: 'manager',
    note: 'Đóng phiếu theo yêu cầu.',
  });
  await assert.rejects(
    () => service.closeTicket('BH-900099/2025', { closed_by: '' }),
    { statusCode: 422, code: 'VALIDATION_ERROR' },
  );
});
