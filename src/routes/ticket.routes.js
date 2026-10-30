const express = require('express');
const { TicketController } = require('../controllers/ticket.controller');
const { TicketRepository } = require('../repositories/ticket.repository');
const { TicketService } = require('../services/ticket-l4.service');

function createTicketRoutes({ pool, ticketService } = {}) {
  const service = ticketService || new TicketService(new TicketRepository(pool));
  const controller = new TicketController(service);
  const router = express.Router();

  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:ticketCode', controller.get);
  router.patch('/:ticketCode', controller.update);
  router.delete('/:ticketCode', controller.close);
  router.post('/:ticketCode/assignment', controller.assign);
  router.get('/:ticketCode/history', controller.history);
  router.patch('/:ticketCode/status', controller.updateStatus);

  return router;
}

module.exports = { createTicketRoutes };
