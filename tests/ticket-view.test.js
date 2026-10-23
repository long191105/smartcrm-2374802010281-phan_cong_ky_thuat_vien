const assert = require('node:assert/strict');
const test = require('node:test');
const { toTicketView } = require('../src/api/ticket-view.mjs');

test('toTicketView keeps the presentation contract, ISO dates, nulls, and masked phone', () => {
  const ticket = toTicketView({
    ticket_code: 'BH-000123/2026',
    category_name: 'MAN_HINH',
    priority: 'CAO',
    status: 'MOI',
    due_date: '2026-10-10T10:00:00+07:00',
    center_code: 'TT04',
    serial_no: null,
    customer_id: 1024,
    customer_phone: '0901234567',
    technician_code: null,
    appointment_start: null,
  });

  assert.deepEqual(Object.keys(ticket), [
    'ticketCode',
    'category',
    'priority',
    'status',
    'dueAt',
    'centerCode',
    'serialNumber',
    'customerReference',
    'customerPhone',
    'technicianCode',
    'technicianName',
    'appointmentAt',
  ]);
  assert.equal(ticket.ticketCode, 'BH-000123/2026');
  assert.equal(ticket.dueAt, '2026-10-10T03:00:00.000Z');
  assert.equal(ticket.serialNumber, null);
  assert.equal(ticket.technicianCode, null);
  assert.equal(ticket.appointmentAt, null);
  assert.equal(ticket.customerPhone, '090****567');
});

test('toTicketView rejects malformed ticket data', () => {
  assert.throws(() => toTicketView({ ticket_code: 'BH-000123/2026', due_date: 'yesterday' }), TypeError);
  assert.throws(() => toTicketView({ ticket_code: 'BH-000123/2026' }), TypeError);
  assert.throws(() => toTicketView({ category_name: 'PIN' }), TypeError);
});
