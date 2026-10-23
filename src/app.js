const express = require('express');
const path = require('path');
const { AppError } = require('./errors/AppError');
const { createTicketRoutes } = require('./routes/ticket.routes');
const { createTechnicianRoutes } = require('./routes/technician.routes');
const { createAppointmentRoutes } = require('./routes/appointment.routes');

function createApp({ pool, ticketService, technicianService, appointmentService }) {
  if (!pool || typeof pool.query !== 'function') {
    throw new TypeError('createApp requires a PostgreSQL-compatible pool');
  }

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.use(express.static(path.resolve(__dirname, '..', 'dist')));

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
  app.use('/api/technicians', createTechnicianRoutes({ pool, service: technicianService }));
  app.use('/api/appointments', createAppointmentRoutes({ pool, service: appointmentService }));

  app.use((req, res) => {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Không tìm thấy tài nguyên.',
      fields: {},
    });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
      return res.status(400).json({
        error: 'INVALID_JSON',
        message: 'Nội dung JSON không hợp lệ.',
        fields: {},
      });
    }

    if (error instanceof AppError) {
      const response = {
        error: error.code,
        message: error.message,
        fields: error.details || {},
      };
      return res.status(error.statusCode).json(response);
    }

    if (req.path === '/health/ready') {
      console.error('Database readiness check failed:', error);
      return res.status(503).json({
        error: 'DATABASE_UNAVAILABLE',
        message: 'Cơ sở dữ liệu hiện không khả dụng.',
        fields: {},
      });
    }

    console.error('Unhandled request error:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Đã xảy ra lỗi hệ thống.',
      fields: {},
    });
  });

  return app;
}

module.exports = { createApp };
