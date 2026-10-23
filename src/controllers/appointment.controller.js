class AppointmentController {
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

  create = async (req, res, next) => {
    try {
      res.status(201).json(await this.service.create(req.body));
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { AppointmentController };
