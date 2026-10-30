const { z } = require('zod');
const { validate } = require('../validation');

const calendarDateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  });
const listSchema = z.object({
  technician_code: z.preprocess(
    (value) => value === '' ? undefined : value,
    z.string().regex(/^KT\d{3}$/).optional(),
  ),
  date: z.preprocess(
    (value) => value === '' ? undefined : value,
    calendarDateSchema.optional(),
  ),
});
const createSchema = z.object({
  ticket_code: z.string().regex(/^BH-\d{6}\/\d{4}$/),
  appointment_type: z.enum(['GIAO_MAY', 'NHAN_MAY', 'KIEM_TRA_TAI_CHO']),
  scheduled_start: z.string().datetime({ offset: true }),
  duration_minutes: z.number().int().min(15).max(240),
  note: z.string().trim().max(255).optional().default(''),
});
const appointmentIdSchema = z.string().regex(/^[1-9]\d*$/).transform(Number)
  .refine(Number.isSafeInteger);
const updateSchema = z.object({
  appointment_type: z.enum(['GIAO_MAY', 'NHAN_MAY', 'KIEM_TRA_TAI_CHO']).optional(),
  scheduled_start: z.string().datetime({ offset: true }).optional(),
  duration_minutes: z.number().int().min(15).max(240).optional(),
  note: z.string().trim().max(255).optional(),
}).refine((input) => Object.keys(input).length > 0, 'Cần ít nhất một trường để cập nhật.');

class AppointmentService {
  constructor(repository) {
    this.repository = repository;
  }

  async list(query) {
    const input = validate(listSchema, query);
    return this.repository.list({
      technicianCode: input.technician_code,
      date: input.date,
    });
  }

  async create(body) {
    const input = validate(createSchema, body);
    return this.repository.create({
      ticketCode: input.ticket_code,
      appointmentType: input.appointment_type,
      startAt: input.scheduled_start,
      durationMinutes: input.duration_minutes,
      note: input.note,
    });
  }

  async get(appointmentId) {
    const id = validate(appointmentIdSchema, appointmentId);
    return this.repository.get(id);
  }

  async update(appointmentId, body) {
    const id = validate(appointmentIdSchema, appointmentId);
    const input = validate(updateSchema, body);
    return this.repository.update({
      appointmentId: id,
      appointmentType: input.appointment_type,
      startAt: input.scheduled_start,
      durationMinutes: input.duration_minutes,
      note: input.note,
    });
  }

  async cancel(appointmentId) {
    const id = validate(appointmentIdSchema, appointmentId);
    return this.repository.cancel(id);
  }
}

module.exports = { AppointmentService };
