const { AppError } = require('../errors/AppError');

const TICKET_STATUSES = new Set([
  'MOI',
  'DA_PHAN_CONG',
  'DANG_XU_LY',
  'CHO_LINH_KIEN',
  'HOAN_TAT',
  'DA_DONG',
]);
const CATEGORY_NAMES = new Set([
  'MAN_HINH',
  'PIN',
  'SAC',
  'PHAN_MEM',
  'NUOC_VAO',
  'KHAC',
]);

class TicketService {
  constructor(ticketRepository) {
    this.ticketRepository = ticketRepository;
  }

  async listTickets(query) {
    const status = this.#optionalEnum(query.status, TICKET_STATUSES, 'status');
    const categoryName = this.#optionalEnum(
      query.category_name,
      CATEGORY_NAMES,
      'category_name',
    );
    const centerCode = query.center_code;
    if (centerCode && !/^TT\d{2}$/.test(centerCode)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'center_code không hợp lệ.');
    }

    const limit = this.#integer(query.limit, 100, 1, 100, 'limit');
    const offset = this.#integer(query.offset, 0, 0, Number.MAX_SAFE_INTEGER, 'offset');

    return this.ticketRepository.list({
      status,
      centerCode,
      categoryName,
      limit,
      offset,
    });
  }

  async assignTicket(ticketCode, body) {
    if (!/^BH-\d{6}\/\d{4}$/.test(ticketCode)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'ticket_code không hợp lệ.');
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Request body phải là object JSON.');
    }

    const errors = {};
    if (typeof body.technician_code !== 'string'
      || !/^KT\d{3}$/.test(body.technician_code)) {
      errors.technician_code = 'Phải có định dạng KT và 3 chữ số.';
    }
    if (typeof body.assigned_by !== 'string'
      || body.assigned_by.trim().length === 0
      || body.assigned_by.length > 100) {
      errors.assigned_by = 'Phải là mã người thực hiện dạng chuỗi, tối đa 100 ký tự.';
    }
    if (body.confirm_overload !== undefined
      && typeof body.confirm_overload !== 'boolean') {
      errors.confirm_overload = 'Phải là boolean.';
    }
    if (Object.keys(errors).length > 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ.', errors);
    }

    return this.ticketRepository.assign({
      ticketCode,
      technicianCode: body.technician_code,
      assignedBy: body.assigned_by.trim(),
      confirmOverload: body.confirm_overload === true,
    });
  }

  #optionalEnum(value, allowed, field) {
    if (value === undefined || value === '') return undefined;
    if (typeof value !== 'string' || !allowed.has(value)) {
      throw new AppError(400, 'VALIDATION_ERROR', `${field} không hợp lệ.`);
    }
    return value;
  }

  #integer(value, fallback, minimum, maximum, field) {
    if (value === undefined || value === '') return fallback;
    if (!/^\d+$/.test(String(value))) {
      throw new AppError(400, 'VALIDATION_ERROR', `${field} phải là số nguyên hợp lệ.`);
    }
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        `${field} phải nằm trong khoảng ${minimum}–${maximum}.`,
      );
    }
    return number;
  }
}

module.exports = { TicketService };
