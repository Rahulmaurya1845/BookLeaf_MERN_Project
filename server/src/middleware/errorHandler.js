const ApiError = require('../utils/ApiError');

const notFound = (req, res, next) => next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message;
  const details = err.details;

  if (err.name === 'CastError') { status = 400; message = `Invalid ${err.path}`; }
  else if (err.code === 11000) {
    status = 409;
    // Show exactly which field is duplicated (helps debugging)
    console.error('[duplicate key]', JSON.stringify(err.keyValue || {}), '| index:', err.keyPattern ? JSON.stringify(err.keyPattern) : err.message);
    message = `Duplicate value${err.keyValue ? ` for ${Object.keys(err.keyValue).join(', ')}` : ''}`;
  }
  else if (err.type === 'entity.parse.failed') { status = 400; message = 'Malformed JSON body'; }
  else if (!err.status) {
    console.error('[unhandled]', err);
    status = 500;
    message = 'Something went wrong on our side. Please try again.';
  }
  res.status(status).json({ error: { status, message, ...(details ? { details } : {}) } });
};

module.exports = { notFound, errorHandler };