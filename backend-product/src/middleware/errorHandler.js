// Centralized error handler — keep this as the LAST middleware registered in server.js
function errorHandler(err, req, res, next) {
  console.error(err.stack || err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
  });
}

module.exports = errorHandler;
