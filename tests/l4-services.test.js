const assert = require('node:assert/strict');
const test = require('node:test');
const { AppError } = require('../src/errors/AppError');
const { AppointmentService } = require('../src/services/appointment.service');
const { TechnicianService } = require('../src/services/technician.service');

test('technician suggestions forward skill, center, and active filters', async () => {
  let received;
  const service = new TechnicianService({
    async list(query) {
      received = query;
      return { items: [], total: 0 };
    },
  });
  await service.list({ category_name: 'PIN', center_code: 'TT04' });
  assert.deepEqual(received, {
    categoryName: 'PIN',
    centerCode: 'TT04',
    active: true,
    limit: 100,
  });
});

test('technician input errors return 422 with invalid fields', async () => {
  const service = new TechnicianService({ async list() { assert.fail('repository must not run'); } });
  await assert.rejects(
    () => service.list({ center_code: 'wrong' }),
    (error) => error instanceof AppError
      && error.statusCode === 422
      && error.code === 'VALIDATION_ERROR'
      && Object.hasOwn(error.details, 'center_code'),
  );
});

test('appointment creation normalizes an ISO date and optional note', async () => {
  let received;
  const service = new AppointmentService({
    async create(input) {
      received = input;
      return { appointment_id: 1 };
    },
  });
  await service.create({
    ticket_code: 'BH-900001/2025',
    appointment_type: 'NHAN_MAY',
    scheduled_start: '2026-10-20T14:00:00+07:00',
    duration_minutes: 60,
  });
  assert.deepEqual(received, {
    ticketCode: 'BH-900001/2025',
    appointmentType: 'NHAN_MAY',
    startAt: '2026-10-20T14:00:00+07:00',
    durationMinutes: 60,
    note: '',
  });
});

test('invalid appointment data returns 422 and identifies bad fields', async () => {
  const service = new AppointmentService({ async create() { assert.fail('repository must not run'); } });
  await assert.rejects(
    () => service.create({
      ticket_code: 'invalid',
      appointment_type: 'PICKUP',
      scheduled_start: 'not-a-date',
      duration_minutes: 10,
    }),
    (error) => error instanceof AppError
      && error.statusCode === 422
      && error.code === 'VALIDATION_ERROR'
      && ['ticket_code', 'appointment_type', 'scheduled_start', 'duration_minutes']
        .every((field) => Object.hasOwn(error.details, field)),
  );
});
