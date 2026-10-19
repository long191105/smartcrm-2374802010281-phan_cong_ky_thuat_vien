const express = require('express');
const { TicketController } = require('../controllers/ticket.controller');
const { TicketRepository } = require('../repositories/ticket.repository');
const { TicketService } = require('../services/ticket-l4.service');

function createTicketRoutes({ pool, ticketService } = {}) {
  const service = ticketService || new TicketService(new TicketRepository(pool));
  const controller = new TicketController(service);
  const router = express.Router();

  router.get('/', controller.list);
  router.post('/:ticketCode/assignment', controller.assign);

  return router;
}

module.exports = { createTicketRoutes };
