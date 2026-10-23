class TechnicianController {
  constructor(service) {
    this.service = service;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.service.list(req.query));
    } catch (error) {
      next(error);
    }
  };

  listAssignedTickets = async (req, res, next) => {
    try {
      res.json(await this.service.listAssignedTickets(
        req.params.technicianCode,
        req.query,
      ));
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { TechnicianController };
