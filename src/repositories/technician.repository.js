const { AppError } = require('../errors/AppError');
const { MAX_OPEN_TICKETS, OPEN_TICKET_STATUSES } = require('../constants/l4');

class TechnicianRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async list({ categoryName, centerCode, active, limit }) {
    const values = [active];
    const conditions = ['technician.is_active = $1'];
    if (centerCode) {
      values.push(centerCode);
      conditions.push(`technician.center_code = $${values.length}`);
    }
    if (categoryName) {
      values.push(categoryName);
      conditions.push(
        `EXISTS (
           SELECT 1 FROM technician_skill AS matching_skill
           WHERE matching_skill.technician_id = technician.technician_id
             AND matching_skill.category_name = $${values.length}
         )`,
      );
    }
    const where = conditions.join(' AND ');
    const workloadValues = [...values, OPEN_TICKET_STATUSES, MAX_OPEN_TICKETS, limit];
    const [count, result] = await Promise.all([
      this.pool.query(
        `SELECT COUNT(*)::INTEGER AS total
         FROM technician WHERE ${where}`,
        values,
      ),
      this.pool.query(
        `SELECT technician.technician_id, technician.technician_code,
                technician.full_name, technician.center_code, technician.level,
                technician.is_active,
                COALESCE(skill_data.skills, '[]'::JSON) AS skills,
                COALESCE(workload.open_tickets, 0)::INTEGER AS open_tickets,
                $${values.length + 2}::INTEGER AS max_open_tickets,
                COALESCE(workload.open_tickets, 0) >= $${values.length + 2} AS at_limit
         FROM technician
         LEFT JOIN LATERAL (
           SELECT JSON_AGG(JSON_BUILD_OBJECT(
             'category_name', technician_skill.category_name,
             'proficiency', technician_skill.proficiency
           ) ORDER BY technician_skill.category_name) AS skills
           FROM technician_skill
           WHERE technician_skill.technician_id = technician.technician_id
         ) AS skill_data ON TRUE
         LEFT JOIN LATERAL (
           SELECT COUNT(*) AS open_tickets
           FROM ticket_assignment AS assignment
           JOIN ticket ON ticket.ticket_id = assignment.ticket_id
           WHERE assignment.technician_id = technician.technician_id
             AND assignment.ended_at IS NULL
             AND ticket.status = ANY($${values.length + 1}::VARCHAR[])
         ) AS workload ON TRUE
         WHERE ${where}
         ORDER BY open_tickets ASC, technician.technician_code ASC
         LIMIT $${values.length + 3}`,
        workloadValues,
      ),
    ]);
    return { items: result.rows, total: count.rows[0].total };
  }

  async listAssignedTickets(technicianCode, status) {
    const technician = await this.pool.query(
      'SELECT technician_id FROM technician WHERE technician_code = $1 AND is_active = TRUE',
      [technicianCode],
    );
    if (technician.rowCount === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy kỹ thuật viên đang hoạt động.');
    }

    const values = [technician.rows[0].technician_id];
    const statusFilter = status ? `AND ticket.status = $${values.push(status)}` : '';
    const result = await this.pool.query(
      `SELECT ticket.ticket_code, ticket.customer_id, ticket.serial_no,
              ticket.center_code, ticket.category_name, ticket.priority,
              ticket.status, ticket.due_date,
              next_appointment.start_at AS appointment_start,
              next_appointment.appointment_type
       FROM ticket_assignment AS assignment
       JOIN ticket ON ticket.ticket_id = assignment.ticket_id
       LEFT JOIN LATERAL (
         SELECT appointment.start_at, appointment.appointment_type
         FROM appointment
         WHERE appointment.ticket_id = ticket.ticket_id
           AND appointment.status IN ('DA_DAT', 'DA_XAC_NHAN')
           AND appointment.start_at >= NOW()
         ORDER BY appointment.start_at ASC
         LIMIT 1
       ) AS next_appointment ON TRUE
       WHERE assignment.technician_id = $1
         AND assignment.ended_at IS NULL
         ${statusFilter}
       ORDER BY ticket.due_date ASC, ticket.ticket_code ASC`,
      values,
    );
    return { items: result.rows, total: result.rowCount };
  }
}

module.exports = { TechnicianRepository };
