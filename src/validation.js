const { AppError } = require('./errors/AppError');

function validate(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const fields = {};
    for (const issue of result.error.issues) {
      const field = issue.path.join('.') || 'request';
      fields[field] = issue.message;
    }
    throw new AppError(422, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ.', fields);
  }
  return result.data;
}

module.exports = { validate };
