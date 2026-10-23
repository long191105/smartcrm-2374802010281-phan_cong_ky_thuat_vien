const express = require('express');
const { TechnicianController } = require('../controllers/technician.controller');
const { TechnicianRepository } = require('../repositories/technician.repository');
const { TechnicianService } = require('../services/technician.service');

function createTechnicianRoutes({ pool, service } = {}) {
  const technicianService = service || new TechnicianService(new TechnicianRepository(pool));
  const controller = new TechnicianController(technicianService);
  const router = express.Router();
  router.get('/', controller.list);
  router.get('/:technicianCode/tickets', controller.listAssignedTickets);
  return router;
}

module.exports = { createTechnicianRoutes };
