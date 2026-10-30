const { z } = require('zod');
const { validate } = require('../validation');

const TICKET_STATUSES = [
  'MOI',
  'DA_PHAN_CONG',
  'DANG_XU_LY',
  'CHO_LINH_KIEN',
  'HOAN_TAT',
  'DA_DONG',
];
const CATEGORY_NAMES = [
  'MAN_HINH',
  'PIN',
  'SAC',
  'PHAN_MEM',
  'NUOC_VAO',
  'KHAC',
];
const ticketCodeSchema = z.object({
  ticket_code: z.string().regex(/^BH-\d{6}\/\d{4}$/, 'Mã phiếu không hợp lệ.'),
});
const listQuerySchema = z.object({
  ticket_code: z.preprocess((value) => value === '' ? undefined : value, z.string().regex(/^BH-\d{6}\/\d{4}$/, 'Mã phiếu không hợp lệ.').optional()),
  status: z.preprocess((value) => value === '' ? undefined : value, z.enum(TICKET_STATUSES).optional()),
  center_code: z.preprocess((value) => value === '' ? undefined : value, z.string().regex(/^TT\d{2}$/, 'Mã trung tâm không hợp lệ.').optional()),
  category_name: z.preprocess((value) => value === '' ? undefined : value, z.enum(CATEGORY_NAMES).optional()),
  limit: z.preprocess((value) => value === undefined || value === '' ? 100 : Number(value), z.number().int().min(1).max(100)),
  offset: z.preprocess((value) => value === undefined || value === '' ? 0 : Number(value), z.number().int().min(0).max(Number.MAX_SAFE_INTEGER)),
});
const assignmentSchema = z.object({
  technician_code: z.string().regex(/^KT\d{3}$/, 'Phải có định dạng KT và 3 chữ số.'),
  assigned_by: z.string().trim().min(1, 'Cần mã người phân công.').max(100, 'Tối đa 100 ký tự.'),
  confirm_overload: z.boolean().default(false),
});
const statusSchema = z.object({
  status: z.enum(['DANG_XU_LY', 'CHO_LINH_KIEN', 'HOAN_TAT']),
  changed_by: z.string().regex(/^KT\d{3}$/, 'Phải là mã kỹ thuật viên dạng KT và 3 chữ số.'),
  note: z.string().trim().max(255).optional().default(''),
});
const ticketInputSchema = z.object({
  ticket_code: z.string().regex(/^BH-\d{6}\/\d{4}$/),
  customer_id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  serial_no: z.string().trim().regex(/^[A-Za-z0-9-]{6,50}$/),
  center_code: z.string().regex(/^TT\d{2}$/),
  category_name: z.enum(CATEGORY_NAMES),
  priority: z.enum(['CAO', 'TRUNG_BINH', 'THAP']),
  issue_desc: z.string().trim().max(2000).optional().default(''),
  received_at: z.string().datetime({ offset: true }),
  due_date: z.string().datetime({ offset: true }),
  is_warranty: z.boolean().default(true),
  created_by: z.string().trim().min(1).max(100),
}).superRefine((input, context) => {
  if (Date.parse(input.due_date) < Date.parse(input.received_at)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['due_date'],
      message: 'Hạn cam kết phải bằng hoặc sau thời điểm tiếp nhận.',
    });
  }
});
const ticketUpdateFields = {
  customer_id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  serial_no: z.string().trim().regex(/^[A-Za-z0-9-]{6,50}$/),
  center_code: z.string().regex(/^TT\d{2}$/),
  category_name: z.enum(CATEGORY_NAMES),
  priority: z.enum(['CAO', 'TRUNG_BINH', 'THAP']),
  issue_desc: z.string().trim().max(2000),
  due_date: z.string().datetime({ offset: true }),
  is_warranty: z.boolean(),
};
const ticketUpdateSchema = z.object(ticketUpdateFields).partial().refine(
  (input) => Object.keys(input).length > 0,
  'Cần ít nhất một trường để cập nhật.',
);
const closeTicketSchema = z.object({
  closed_by: z.string().trim().min(1).max(100),
  note: z.string().trim().max(255).optional().default('Đóng phiếu theo yêu cầu.'),
});
class TicketService {
  constructor(ticketRepository) {
    this.ticketRepository = ticketRepository;
  }

  async createTicket(body) {
    const input = validate(ticketInputSchema, body);
    return this.ticketRepository.createTicket({
      ticketCode: input.ticket_code,
      customerId: input.customer_id,
      productId: input.product_id,
      serialNo: input.serial_no,
      centerCode: input.center_code,
      categoryName: input.category_name,
      priority: input.priority,
      issueDesc: input.issue_desc,
      receivedAt: input.received_at,
      dueDate: input.due_date,
      isWarranty: input.is_warranty,
      createdBy: input.created_by,
    });
  }

  async listTickets(query) {
    const input = validate(listQuerySchema, query);
    return this.ticketRepository.list({
      ticketCode: input.ticket_code,
      status: input.status,
      centerCode: input.center_code,
      categoryName: input.category_name,
      limit: input.limit,
      offset: input.offset,
    });
  }

  async getTicket(ticketCode) {
    const code = validate(ticketCodeSchema, { ticket_code: ticketCode }).ticket_code;
    return this.ticketRepository.getTicket(code);
  }

  async updateTicket(ticketCode, body) {
    const code = validate(ticketCodeSchema, { ticket_code: ticketCode }).ticket_code;
    const input = validate(ticketUpdateSchema, body);
    return this.ticketRepository.updateTicket({
      ticketCode: code,
      changes: input,
    });
  }

  async closeTicket(ticketCode, body) {
    const code = validate(ticketCodeSchema, { ticket_code: ticketCode }).ticket_code;
    const input = validate(closeTicketSchema, body);
    return this.ticketRepository.closeTicket({
      ticketCode: code,
      closedBy: input.closed_by,
      note: input.note,
    });
  }

  async assignTicket(ticketCode, body) {
    const code = validate(ticketCodeSchema, { ticket_code: ticketCode }).ticket_code;
    const input = validate(assignmentSchema, body);
    return this.ticketRepository.assign({
      ticketCode: code,
      technicianCode: input.technician_code,
      assignedBy: input.assigned_by,
      confirmOverload: input.confirm_overload,
    });
  }

  async getHistory(ticketCode) {
    const code = validate(ticketCodeSchema, { ticket_code: ticketCode }).ticket_code;
    return this.ticketRepository.getHistory(code);
  }

  async updateStatus(ticketCode, body) {
    const code = validate(ticketCodeSchema, { ticket_code: ticketCode }).ticket_code;
    const input = validate(statusSchema, body);
    return this.ticketRepository.updateStatus({
      ticketCode: code,
      status: input.status,
      changedBy: input.changed_by,
      note: input.note,
    });
  }
}

module.exports = { TicketService };
