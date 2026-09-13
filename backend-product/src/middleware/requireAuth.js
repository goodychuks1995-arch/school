const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    const err = new Error('No token provided');
    err.status = 401;
    return next(err);
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, role }
    next();
  } catch (e) {
    const err = new Error('Invalid or expired token');
    err.status = 401;
    next(err);
  }
}

module.exports = requireAuth;
