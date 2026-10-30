const { AppError } = require('../errors/AppError');
const {
  MAX_OPEN_TICKETS,
  MIN_SKILL_PROFICIENCY,
  OPEN_TICKET_STATUSES,
} = require('../constants/l4');

class TicketRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async createTicket({
    ticketCode,
    customerId,
    productId,
    serialNo,
    centerCode,
    categoryName,
    priority,
    issueDesc,
    receivedAt,
    dueDate,
    isWarranty,
    createdBy,
  }) {
    const client = await this.pool.connect();
    let transactionStarted = false;

    try {
      await client.query('BEGIN');
      transactionStarted = true;
      const result = await client.query(
        `INSERT INTO ticket (
           ticket_code, customer_id, product_id, serial_no, center_code, category_name,
           priority, status, issue_desc, received_at, due_date, is_warranty
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'MOI', $8, $9, $10, $11)
         RETURNING ticket_id, ticket_code, customer_id, product_id, serial_no,
                   center_code, category_name, priority, status, issue_desc,
                   received_at, due_date, is_warranty`,
        [
          ticketCode,
          customerId,
          productId,
          serialNo,
          centerCode,
          categoryName,
          priority,
          issueDesc || null,
          receivedAt,
          dueDate,
          isWarranty,
        ],
      );
      const ticket = result.rows[0];
      await client.query(
        `INSERT INTO ticket_status_log (ticket_id, from_status, to_status, changed_by, note)
         VALUES ($1, NULL, 'MOI', $2, 'Tiếp nhận phiếu bảo hành.')`,
        [ticket.ticket_id, createdBy],
      );
      await client.query('COMMIT');
      transactionStarted = false;
      return ticket;
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          throw new AggregateError(
            [error, rollbackError],
            'Ticket creation failed and the database transaction could not be rolled back.',
          );
        }
      }
      if (error.code === '23505') {
        throw new AppError(409, 'TICKET_CODE_EXISTS', 'Mã phiếu bảo hành đã tồn tại.');
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async list({ ticketCode, status, centerCode, categoryName, limit, offset }) {
    const values = [];
    const conditions = [];

    if (ticketCode) {
      values.push(ticketCode);
      conditions.push(`t.ticket_code = $${values.length}`);
    }

    if (status) {
      values.push(status);
      conditions.push(`t.status = $${values.length}`);
    }

    if (centerCode) {
      values.push(centerCode);
      conditions.push(`t.center_code = $${values.length}`);
    }
    if (categoryName) {
      values.push(categoryName);
      conditions.push(`t.category_name = $${values.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    values.push(limit, offset);
    const result = await this.pool.query(
      `WITH filtered AS (
         SELECT t.ticket_id, t.ticket_code, t.customer_id, t.product_id,
                t.serial_no, t.center_code, t.category_name, t.priority,
                t.status, t.issue_desc, t.received_at, t.due_date,
                t.closed_at, t.is_warranty, current_assignment.technician_code,
                current_assignment.technician_name
         FROM ticket AS t
         LEFT JOIN LATERAL (
           SELECT technician.technician_code, technician.full_name AS technician_name
           FROM ticket_assignment AS assignment
           JOIN technician ON technician.technician_id = assignment.technician_id
           WHERE assignment.ticket_id = t.ticket_id AND assignment.ended_at IS NULL
           ORDER BY assignment.assigned_at DESC
           LIMIT 1
         ) AS current_assignment ON TRUE
         ${where}
       ),
       page AS (
         SELECT *
         FROM filtered
         ORDER BY due_date ASC, ticket_id ASC
         LIMIT $${values.length - 1} OFFSET $${values.length}
       ),
       total AS (
         SELECT COUNT(*)::INTEGER AS total FROM filtered
       )
       SELECT page.*, total.total
       FROM total
       LEFT JOIN page ON TRUE
       ORDER BY page.due_date ASC NULLS LAST, page.ticket_id ASC NULLS LAST`,
      values,
    );

    return {
      items: result.rows
        .filter((row) => row.ticket_id !== null)
        .map(({ total, ...ticket }) => ticket),
      total: result.rows.length > 0 ? result.rows[0].total : 0,
    };
  }

  async getTicket(ticketCode) {
    const result = await this.list({
      ticketCode,
      limit: 1,
      offset: 0,
    });
    if (result.items.length === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy phiếu bảo hành.');
    }
    return result.items[0];
  }

  async updateTicket({ ticketCode, changes }) {
    const editableColumns = {
      customer_id: 'customer_id',
      product_id: 'product_id',
      serial_no: 'serial_no',
      center_code: 'center_code',
      category_name: 'category_name',
      priority: 'priority',
      issue_desc: 'issue_desc',
      due_date: 'due_date',
      is_warranty: 'is_warranty',
    };
    const entries = Object.entries(changes);
    const values = entries.map(([, value]) => value);
    const assignments = entries.map(([field], index) =>
      `${editableColumns[field]} = $${index + 1}`);
    const client = await this.pool.connect();
    let transactionStarted = false;

    try {
      await client.query('BEGIN');
      transactionStarted = true;
      const ticketResult = await client.query(
        `SELECT ticket_id, status, received_at
         FROM ticket
         WHERE ticket_code = $1
         FOR UPDATE`,
        [ticketCode],
      );
      const ticket = ticketResult.rows[0];
      if (!ticket) {
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy phiếu bảo hành.');
      }
      if (ticket.status !== 'MOI') {
        throw new AppError(409, 'TICKET_NOT_EDITABLE', 'Chỉ phiếu mới chưa xử lý mới được chỉnh sửa.');
      }
      const assignmentResult = await client.query(
        `SELECT 1 FROM ticket_assignment WHERE ticket_id = $1 LIMIT 1`,
        [ticket.ticket_id],
      );
      if (assignmentResult.rowCount > 0) {
        throw new AppError(409, 'TICKET_NOT_EDITABLE', 'Không thể chỉnh sửa phiếu đã có lịch sử phân công.');
      }
      if (changes.due_date && Date.parse(changes.due_date) < new Date(ticket.received_at).getTime()) {
        throw new AppError(
          422,
          'VALIDATION_ERROR',
          'Dữ liệu không hợp lệ.',
          { due_date: 'Hạn cam kết phải bằng hoặc sau thời điểm tiếp nhận.' },
        );
      }

      values.push(ticket.ticket_id);
      const result = await client.query(
        `UPDATE ticket
         SET ${assignments.join(', ')}
         WHERE ticket_id = $${values.length}
         RETURNING ticket_id, ticket_code, customer_id, product_id, serial_no,
                   center_code, category_name, priority, status, issue_desc,
                   received_at, due_date, is_warranty`,
        values,
      );
      await client.query('COMMIT');
      transactionStarted = false;
      return result.rows[0];
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          throw new AggregateError(
            [error, rollbackError],
            'Ticket update failed and the database transaction could not be rolled back.',
          );
        }
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async closeTicket({ ticketCode, closedBy, note }) {
    const client = await this.pool.connect();
    let transactionStarted = false;

    try {
      await client.query('BEGIN');
      transactionStarted = true;
      const result = await client.query(
        `SELECT ticket_id, status
         FROM ticket
         WHERE ticket_code = $1
         FOR UPDATE`,
        [ticketCode],
      );
      const ticket = result.rows[0];
      if (!ticket) {
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy phiếu bảo hành.');
      }
      if (ticket.status !== 'MOI') {
        throw new AppError(409, 'TICKET_NOT_CLOSABLE', 'Chỉ phiếu mới chưa xử lý mới được đóng.');
      }
      const linkedRecords = await client.query(
        `SELECT EXISTS (
           SELECT 1 FROM ticket_assignment WHERE ticket_id = $1
         ) OR EXISTS (
           SELECT 1 FROM appointment WHERE ticket_id = $1
         ) AS has_history`,
        [ticket.ticket_id],
      );
      if (linkedRecords.rows[0].has_history) {
        throw new AppError(
          409,
          'TICKET_HAS_HISTORY',
          'Không thể đóng phiếu đã phát sinh phân công hoặc lịch hẹn.',
        );
      }

      await client.query(
        `UPDATE ticket
         SET status = 'DA_DONG', closed_at = NOW()
         WHERE ticket_id = $1`,
        [ticket.ticket_id],
      );
      await client.query(
        `INSERT INTO ticket_status_log (ticket_id, from_status, to_status, changed_by, note)
         VALUES ($1, 'MOI', 'DA_DONG', $2, $3)`,
        [ticket.ticket_id, closedBy, note],
      );
      await client.query('COMMIT');
      transactionStarted = false;
      return {
        ticket_code: ticketCode,
        from_status: 'MOI',
        status: 'DA_DONG',
      };
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          throw new AggregateError(
            [error, rollbackError],
            'Ticket close failed and the database transaction could not be rolled back.',
          );
        }
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async getHistory(ticketCode) {
    const ticket = await this.pool.query(
      'SELECT ticket_id FROM ticket WHERE ticket_code = $1',
      [ticketCode],
    );
    if (ticket.rowCount === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy phiếu bảo hành.');
    }

    const result = await this.pool.query(
      `SELECT changed_at AS occurred_at, 'STATUS' AS event_type,
              from_status, to_status, changed_by AS actor, NULL::VARCHAR AS technician_code,
              note
       FROM ticket_status_log
       WHERE ticket_id = $1
       UNION ALL
       SELECT assignment.assigned_at, 'ASSIGNMENT', NULL::VARCHAR, NULL::VARCHAR,
              assignment.assigned_by, technician.technician_code, assignment.reason
       FROM ticket_assignment AS assignment
       JOIN technician ON technician.technician_id = assignment.technician_id
       WHERE assignment.ticket_id = $1
       ORDER BY occurred_at DESC`,
      [ticket.rows[0].ticket_id],
    );
    return { items: result.rows };
  }

  async updateStatus({ ticketCode, status, changedBy, note }) {
    const client = await this.pool.connect();
    let transactionStarted = false;

    try {
      await client.query('BEGIN');
      transactionStarted = true;
      const result = await client.query(
        `SELECT ticket.ticket_id, ticket.status, technician.technician_code
         FROM ticket
         JOIN ticket_assignment AS assignment
           ON assignment.ticket_id = ticket.ticket_id AND assignment.ended_at IS NULL
         JOIN technician ON technician.technician_id = assignment.technician_id
         WHERE ticket.ticket_code = $1
         FOR UPDATE OF ticket`,
        [ticketCode],
      );
      const ticket = result.rows[0];
      if (!ticket) {
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy phiếu hoặc phiếu chưa được phân công.');
      }
      if (ticket.technician_code !== changedBy) {
        throw new AppError(403, 'FORBIDDEN', 'Chỉ kỹ thuật viên đang phụ trách mới được cập nhật phiếu.');
      }

      const transitions = {
        DA_PHAN_CONG: ['DANG_XU_LY'],
        DANG_XU_LY: ['CHO_LINH_KIEN', 'HOAN_TAT'],
        CHO_LINH_KIEN: ['DANG_XU_LY', 'HOAN_TAT'],
      };
      if (!transitions[ticket.status]?.includes(status)) {
        throw new AppError(
          409,
          'INVALID_STATUS_TRANSITION',
          'Không thể chuyển phiếu về trạng thái trước hoặc bỏ qua bước xử lý.',
          { status: 'Chọn trạng thái tiếp theo hợp lệ.' },
        );
      }

      await client.query(
        `UPDATE ticket
         SET status = $2::VARCHAR,
             closed_at = CASE WHEN $2::VARCHAR = 'HOAN_TAT' THEN NOW() ELSE closed_at END
         WHERE ticket_id = $1`,
        [ticket.ticket_id, status],
      );
      await client.query(
        `INSERT INTO ticket_status_log (ticket_id, from_status, to_status, changed_by, note)
         VALUES ($1, $2, $3, $4, $5)`,
        [ticket.ticket_id, ticket.status, status, changedBy, note || null],
      );
      await client.query('COMMIT');
      transactionStarted = false;
      return {
        ticket_code: ticketCode,
        from_status: ticket.status,
        status,
        changed_by: changedBy,
      };
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          throw new AggregateError(
            [error, rollbackError],
            'Status update failed and the database transaction could not be rolled back.',
          );
        }
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async assign({ ticketCode, technicianCode, assignedBy, confirmOverload }) {
    const client = await this.pool.connect();
    let transactionStarted = false;

    try {
      await client.query('BEGIN');
      transactionStarted = true;

      const ticketResult = await client.query(
        `SELECT ticket_id, ticket_code, center_code, category_name, status
         FROM ticket
         WHERE ticket_code = $1
         FOR UPDATE`,
        [ticketCode],
      );
      const ticket = ticketResult.rows[0];
      if (!ticket) {
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy phiếu bảo hành.');
      }
      if (ticket.status !== 'MOI') {
        throw new AppError(
          409,
          'TICKET_NOT_ASSIGNABLE',
          'Phiếu không còn ở trạng thái chờ phân công.',
        );
      }

      const technicianResult = await client.query(
        `SELECT technician_id, technician_code, full_name, center_code, is_active
         FROM technician
         WHERE technician_code = $1
         FOR UPDATE`,
        [technicianCode],
      );
      const technician = technicianResult.rows[0];
      if (!technician) {
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy kỹ thuật viên.');
      }
      if (!technician.is_active) {
        throw new AppError(409, 'TECHNICIAN_INACTIVE', 'Kỹ thuật viên hiện không hoạt động.');
      }
      if (technician.center_code !== ticket.center_code) {
        throw new AppError(
          409,
          'CENTER_MISMATCH',
          'Kỹ thuật viên không thuộc trung tâm của phiếu.',
        );
      }

      const skillResult = await client.query(
        `SELECT proficiency
         FROM technician_skill
         WHERE technician_id = $1 AND category_name = $2`,
        [technician.technician_id, ticket.category_name],
      );
      if (skillResult.rowCount === 0
        || skillResult.rows[0].proficiency < MIN_SKILL_PROFICIENCY) {
        throw new AppError(
          409,
          'SKILL_MISMATCH',
          `Kỹ thuật viên cần tay nghề từ mức ${MIN_SKILL_PROFICIENCY} cho nhóm sự cố của phiếu.`,
          { category_name: 'Kỹ thuật viên chưa đạt mức tay nghề tối thiểu.' },
        );
      }

      const workloadResult = await client.query(
        `SELECT COUNT(*)::INTEGER AS open_tickets
         FROM ticket_assignment AS assignment
         JOIN ticket AS assigned_ticket ON assigned_ticket.ticket_id = assignment.ticket_id
         WHERE assignment.technician_id = $1
           AND assignment.ended_at IS NULL
           AND assigned_ticket.status = ANY($2::VARCHAR[])`,
        [technician.technician_id, OPEN_TICKET_STATUSES],
      );
      const openTickets = workloadResult.rows[0].open_tickets;
      if (openTickets >= MAX_OPEN_TICKETS && !confirmOverload) {
        throw new AppError(
          409,
          'OVERLOAD_CONFIRMATION_REQUIRED',
          `Kỹ thuật viên đã có ${openTickets} phiếu đang mở; cần xác nhận vượt ngưỡng ${MAX_OPEN_TICKETS}.`,
          { open_tickets: openTickets, max_open_tickets: MAX_OPEN_TICKETS },
        );
      }

      const assignmentResult = await client.query(
        `INSERT INTO ticket_assignment (ticket_id, technician_id, assigned_by)
         VALUES ($1, $2, $3)
         RETURNING assigned_at`,
        [ticket.ticket_id, technician.technician_id, assignedBy],
      );
      await client.query(
        `UPDATE ticket
         SET status = 'DA_PHAN_CONG'
         WHERE ticket_id = $1`,
        [ticket.ticket_id],
      );
      await client.query(
        `INSERT INTO ticket_status_log (
           ticket_id, from_status, to_status, changed_by, note
         ) VALUES ($1, 'MOI', 'DA_PHAN_CONG', $2, $3)`,
        [ticket.ticket_id, assignedBy, `Phân công cho ${technician.technician_code}.`],
      );
      await client.query('COMMIT');
      transactionStarted = false;

      return {
        ticket_code: ticket.ticket_code,
        status: 'DA_PHAN_CONG',
        technician_code: technician.technician_code,
        assigned_by: assignedBy,
        assigned_at: assignmentResult.rows[0].assigned_at,
      };
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          throw new AggregateError(
            [error, rollbackError],
            'Assignment failed and the database transaction could not be rolled back.',
          );
        }
      }
      if (error.code === '23505') {
        throw new AppError(
          409,
          'TICKET_ALREADY_ASSIGNED',
          'Phiếu vừa được phân công bởi một thao tác khác.',
        );
      }
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = { TicketRepository };
