const assert = require('node:assert/strict');
const test = require('node:test');
const { TicketService } = require('../src/services/ticket-l4.service');

const validTicket = {
  ticket_code: 'BH-900099/2025',
  customer_id: 14159,
  product_id: 21,
  serial_no: 'SN541017338391',
  center_code: 'TT04',
  category_name: 'MAN_HINH',
  priority: 'CAO',
  received_at: '2026-10-20T08:00:00+07:00',
  due_date: '2026-10-21T08:00:00+07:00',
  created_by: 'manager',
};

function validationService() {
  return new TicketService({
    async createTicket() { assert.fail('invalid input must not reach the repository'); },
    async updateTicket() { assert.fail('invalid input must not reach the repository'); },
    async closeTicket() { assert.fail('invalid input must not reach the repository'); },
  });
}

test('create validation rejects missing fields and identifies them', async () => {
  await assert.rejects(
    () => validationService().createTicket({ ticket_code: validTicket.ticket_code }),
    (error) => error.code === 'VALIDATION_ERROR'
      && Object.hasOwn(error.details, 'serial_no')
      && Object.hasOwn(error.details, 'priority'),
  );
});

test('create validation rejects unsafe serial identifiers', async () => {
  await assert.rejects(
    () => validationService().createTicket({ ...validTicket, serial_no: "SN' OR 1=1 --" }),
    (error) => error.code === 'VALIDATION_ERROR'
      && Object.hasOwn(error.details, 'serial_no'),
  );
});

test('create validation rejects invalid codes and datetime values', async () => {
  await assert.rejects(
    () => validationService().createTicket({
      ...validTicket,
      ticket_code: 'not-a-ticket',
      received_at: '20/10/2026',
    }),
    (error) => error.code === 'VALIDATION_ERROR'
      && Object.hasOwn(error.details, 'ticket_code')
      && Object.hasOwn(error.details, 'received_at'),
  );
});

test('update validation rejects empty or unsupported changes', async () => {
  const service = validationService();
  await assert.rejects(
    () => service.updateTicket(validTicket.ticket_code, {}),
    { code: 'VALIDATION_ERROR' },
  );
  await assert.rejects(
    () => service.updateTicket(validTicket.ticket_code, { status: 'DA_DONG' }),
    { code: 'VALIDATION_ERROR' },
  );
});
