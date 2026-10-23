const { AppError } = require('../errors/AppError');

class AppointmentRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async list({ technicianCode, date }) {
    const values = [];
    const conditions = [];
    if (technicianCode) {
      values.push(technicianCode);
      conditions.push(`technician.technician_code = $${values.length}`);
    }
    if (date) {
      values.push(date);
      conditions.push(
        `(appointment.start_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE = $${values.length}::DATE`,
      );
    }
    values.push(100);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT appointment.appointment_id, ticket.ticket_code,
              technician.technician_code, technician.full_name,
              appointment.center_code, appointment.appointment_type,
              appointment.start_at, appointment.end_at, appointment.status,
              appointment.note
       FROM appointment
       JOIN ticket ON ticket.ticket_id = appointment.ticket_id
       JOIN technician ON technician.technician_id = appointment.technician_id
       ${where}
       ORDER BY appointment.start_at ASC
       LIMIT $${values.length}`,
      values,
    );
    return { items: result.rows, total: result.rowCount };
  }

  async create({ ticketCode, appointmentType, startAt, durationMinutes, note }) {
    const client = await this.pool.connect();
    let transactionStarted = false;
    const endAt = new Date(new Date(startAt).getTime() + durationMinutes * 60_000);

    try {
      await client.query('BEGIN');
      transactionStarted = true;
      const ticketResult = await client.query(
        `SELECT ticket.ticket_id, ticket.center_code, ticket.status,
                technician.technician_id, technician.technician_code
         FROM ticket
         JOIN ticket_assignment AS assignment
           ON assignment.ticket_id = ticket.ticket_id AND assignment.ended_at IS NULL
         JOIN technician ON technician.technician_id = assignment.technician_id
         WHERE ticket.ticket_code = $1
         FOR UPDATE OF ticket`,
        [ticketCode],
      );
      const ticket = ticketResult.rows[0];
      if (!ticket) {
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy phiếu đã được phân công.');
      }
      if (['HOAN_TAT', 'DA_DONG'].includes(ticket.status)) {
        throw new AppError(409, 'TICKET_CLOSED', 'Không thể đặt lịch cho phiếu đã hoàn tất.');
      }

      const conflict = await client.query(
        `SELECT ticket.ticket_code, appointment.start_at, appointment.end_at
         FROM appointment
         JOIN ticket ON ticket.ticket_id = appointment.ticket_id
         WHERE appointment.technician_id = $1
           AND appointment.status IN ('DA_DAT', 'DA_XAC_NHAN')
           AND appointment.start_at < $3
           AND appointment.end_at > $2
         ORDER BY appointment.start_at
         LIMIT 1
         FOR UPDATE OF appointment`,
        [ticket.technician_id, startAt, endAt],
      );
      if (conflict.rowCount > 0) {
        throw new AppError(
          409,
          'APPOINTMENT_CONFLICT',
          'Khung giờ đã trùng với lịch hẹn của kỹ thuật viên.',
          { scheduled_start: conflict.rows[0].start_at, ticket_code: conflict.rows[0].ticket_code },
        );
      }

      const result = await client.query(
        `INSERT INTO appointment (
           ticket_id, technician_id, center_code, appointment_type,
           start_at, end_at, note
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING appointment_id, start_at, end_at, status`,
        [
          ticket.ticket_id,
          ticket.technician_id,
          ticket.center_code,
          appointmentType,
          startAt,
          endAt,
          note || null,
        ],
      );
      await client.query('COMMIT');
      transactionStarted = false;
      return {
        ...result.rows[0],
        ticket_code: ticketCode,
        technician_code: ticket.technician_code,
        center_code: ticket.center_code,
        appointment_type: appointmentType,
      };
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          throw new AggregateError(
            [error, rollbackError],
            'Appointment failed and the database transaction could not be rolled back.',
          );
        }
      }
      if (error.code === '23P01') {
        throw new AppError(
          409,
          'APPOINTMENT_CONFLICT',
          'Khung giờ vừa được đặt bởi thao tác khác. Vui lòng chọn giờ khác.',
        );
      }
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = { AppointmentRepository };
