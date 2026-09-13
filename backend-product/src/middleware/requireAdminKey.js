// Simple shared-secret guard for admin-only routes (e.g. creating articles).
// Fine while it's just you managing the catalog — swap for real admin
// accounts/roles later if that changes.
function requireAdminKey(req, res, next) {
  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    const err = new Error('Forbidden');
    err.status = 403;
    return next(err);
  }
  next();
}

module.exports = requireAdminKey;
