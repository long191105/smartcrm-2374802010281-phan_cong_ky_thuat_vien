const express = require('express');
const { AppointmentController } = require('../controllers/appointment.controller');
const { AppointmentRepository } = require('../repositories/appointment.repository');
const { AppointmentService } = require('../services/appointment.service');

function createAppointmentRoutes({ pool, service } = {}) {
  const appointmentService = service || new AppointmentService(new AppointmentRepository(pool));
  const controller = new AppointmentController(appointmentService);
  const router = express.Router();
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:appointmentId', controller.get);
  router.patch('/:appointmentId', controller.update);
  router.delete('/:appointmentId', controller.cancel);
  return router;
}

module.exports = { createAppointmentRoutes };
