class TicketController {
  constructor(ticketService) {
    this.ticketService = ticketService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.ticketService.listTickets(req.query));
    } catch (error) {
      next(error);
    }
  };

  assign = async (req, res, next) => {
    try {
      const result = await this.ticketService.assignTicket(
        req.params.ticketCode,
        req.body,
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  history = async (req, res, next) => {
    try {
      res.json(await this.ticketService.getHistory(req.params.ticketCode));
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req, res, next) => {
    try {
      res.json(await this.ticketService.updateStatus(
        req.params.ticketCode,
        req.body,
      ));
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { TicketController };
