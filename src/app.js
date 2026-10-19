const express = require('express');
const { AppError } = require('./errors/AppError');
const { createTicketRoutes } = require('./routes/ticket.routes');

function createApp({ pool, ticketService }) {
  if (!pool || typeof pool.query !== 'function') {
    throw new TypeError('createApp requires a PostgreSQL-compatible pool');
  }

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.get('/', (req, res) => {
    res.json({ service: 'smartcrm-l4-api', status: 'ok' });
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/health/ready', async (req, res, next) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', database: 'connected' });
    } catch (error) {
      next(error);
    }
  });

  app.use('/api/tickets', createTicketRoutes({ pool, ticketService }));

  app.use((req, res) => {
    res.status(404).json({
      error_code: 'NOT_FOUND',
      message: 'Không tìm thấy tài nguyên.',
    });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
      return res.status(400).json({
        error_code: 'INVALID_JSON',
        message: 'Nội dung JSON không hợp lệ.',
      });
    }

    if (error instanceof AppError) {
      const response = {
        error_code: error.code,
        message: error.message,
      };
      if (error.details !== undefined) {
        response.details = error.details;
      }
      return res.status(error.statusCode).json(response);
    }

    if (req.path === '/health/ready') {
      console.error('Database readiness check failed:', error);
      return res.status(503).json({
        error_code: 'DATABASE_UNAVAILABLE',
        message: 'Cơ sở dữ liệu hiện không khả dụng.',
      });
    }

    console.error('Unhandled request error:', error);
    return res.status(500).json({
      error_code: 'INTERNAL_ERROR',
      message: 'Đã xảy ra lỗi hệ thống.',
    });
  });

  return app;
}

module.exports = { createApp };
