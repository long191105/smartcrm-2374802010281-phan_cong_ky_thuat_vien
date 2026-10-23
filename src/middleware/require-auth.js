function readSessionCookie(header = '') {
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === 'smartcrm_session') {
      return part.slice(separator + 1).trim();
    }
  }
  return null;
}

function createRequireAuth(authService, cookieOptions) {
  return async function requireAuth(req, res, next) {
    const sessionToken = readSessionCookie(req.headers.cookie);
    req.sessionToken = sessionToken;
    if (!sessionToken) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Vui lòng đăng nhập để tiếp tục.',
        fields: {},
      });
    }

    try {
      const user = await authService.authenticateSession(sessionToken);
      if (!user) {
        res.clearCookie('smartcrm_session', cookieOptions);
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
          fields: {},
        });
      }
      req.user = user;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = { createRequireAuth, readSessionCookie };
