export function maskPhone(phone) {
  if (phone === null || phone === undefined || phone === '') return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 7) return null;
  return `${digits.slice(0, 3)}${'*'.repeat(digits.length - 6)}${digits.slice(-3)}`;
}

function isoDate(value) {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError('Ticket date must be a valid ISO 8601 date.');
  return date.toISOString();
}

function requiredIsoDate(value) {
  if (value === null || value === undefined) {
    throw new TypeError('Ticket due_date is required.');
  }
  return isoDate(value);
}

/**
 * Contract: ticket_code is a required string; category/status/priority/center are
 * strings, due_date/appointment_start are ISO 8601 strings or Date, and customer,
 * device, phone, technician, and appointment values may be null. Dates mean instants;
 * phone is display-only and masked. Missing code or invalid dates throw TypeError.
 */
export function toTicketView(ticket) {
  if (!ticket || typeof ticket !== 'object' || typeof ticket.ticket_code !== 'string') {
    throw new TypeError('Ticket must include a string ticket_code.');
  }
  return {
    ticketCode: ticket.ticket_code,
    category: ticket.category_name ?? null,
    priority: ticket.priority ?? null,
    status: ticket.status ?? null,
    dueAt: requiredIsoDate(ticket.due_date),
    centerCode: ticket.center_code ?? null,
    serialNumber: ticket.serial_no ?? null,
    customerReference: ticket.customer_id === null || ticket.customer_id === undefined
      ? null
      : String(ticket.customer_id),
    customerPhone: maskPhone(ticket.customer_phone),
    technicianCode: ticket.technician_code ?? null,
    technicianName: ticket.technician_name ?? null,
    appointmentAt: isoDate(ticket.appointment_start),
  };
}
