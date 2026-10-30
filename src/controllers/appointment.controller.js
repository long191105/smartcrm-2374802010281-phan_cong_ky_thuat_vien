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

  get = async (req, res, next) => {
    try {
      res.json(await this.service.get(req.params.appointmentId));
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      res.json(await this.service.update(req.params.appointmentId, req.body));
    } catch (error) {
      next(error);
    }
  };

  cancel = async (req, res, next) => {
    try {
      res.json(await this.service.cancel(req.params.appointmentId));
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { AppointmentController };
