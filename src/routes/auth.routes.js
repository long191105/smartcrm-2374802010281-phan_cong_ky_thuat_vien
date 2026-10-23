const express = require('express');
const { AuthController } = require('../controllers/auth.controller');
const { readSessionCookie } = require('../middleware/require-auth');

function createAuthRoutes({ authService, cookieOptions, requireAuth }) {
  const controller = new AuthController(authService, cookieOptions);
  const router = express.Router();
  router.post('/login', controller.login);
  router.get('/me', requireAuth, controller.me);
  router.post('/logout', (req, res, next) => {
    req.sessionToken = readSessionCookie(req.headers.cookie);
    next();
  }, controller.logout);
  return router;
}

module.exports = { createAuthRoutes };
