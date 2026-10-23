class AuthController {
  constructor(authService, cookieOptions) {
    this.authService = authService;
    this.cookieOptions = cookieOptions;
  }

  login = async (req, res, next) => {
    try {
      const { sessionToken, user } = await this.authService.login(req.body);
      res.cookie('smartcrm_session', sessionToken, {
        ...this.cookieOptions,
        maxAge: 8 * 60 * 60 * 1000,
      });
      res.json({ user });
    } catch (error) {
      next(error);
    }
  };

  me = (req, res) => {
    res.json({ user: req.user });
  };

  logout = async (req, res, next) => {
    try {
      await this.authService.logout(req.sessionToken);
      res.clearCookie('smartcrm_session', this.cookieOptions);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { AuthController };
