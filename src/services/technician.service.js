const { z } = require('zod');
const { validate } = require('../validation');

const categories = ['MAN_HINH', 'PIN', 'SAC', 'PHAN_MEM', 'NUOC_VAO', 'KHAC'];
const ticketStatuses = [
  'MOI',
  'DA_PHAN_CONG',
  'DANG_XU_LY',
  'CHO_LINH_KIEN',
  'HOAN_TAT',
  'DA_DONG',
];
const listSchema = z.object({
  category_name: z.preprocess((value) => value === '' ? undefined : value, z.enum(categories).optional()),
  center_code: z.preprocess((value) => value === '' ? undefined : value, z.string().regex(/^TT\d{2}$/).optional()),
  status: z.preprocess((value) => value === '' || value === undefined ? 'ACTIVE' : value, z.enum(['ACTIVE', 'INACTIVE'])),
  limit: z.preprocess((value) => value === undefined || value === '' ? 100 : Number(value), z.number().int().min(1).max(100)),
});
const ticketListSchema = z.object({
  status: z.preprocess((value) => value === '' ? undefined : value, z.enum(ticketStatuses).optional()),
});
const technicianCodeSchema = z.string().regex(/^KT\d{3}$/);

class TechnicianService {
  constructor(repository) {
    this.repository = repository;
  }

  async list(query) {
    const input = validate(listSchema, query);
    return this.repository.list({
      categoryName: input.category_name,
      centerCode: input.center_code,
      active: input.status === 'ACTIVE',
      limit: input.limit,
    });
  }

  async listAssignedTickets(technicianCode, query) {
    const code = validate(technicianCodeSchema, technicianCode);
    const input = validate(ticketListSchema, query);
    return this.repository.listAssignedTickets(code, input.status);
  }
}

module.exports = { TechnicianService };
