const { HTTP_STATUS } = require('../utils/constants');

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Default error
  let error = { ...err };
  error.message = err.message;

  // PostgreSQL errors
  if (err.code === '23505') {
    // Unique violation
    const message = 'Duplicate entry. This record already exists.';
    error = { message, statusCode: HTTP_STATUS.CONFLICT };
  }

  if (err.code === '23503') {
    // Foreign key violation
    const message = 'Invalid reference. Related record not found.';
    error = { message, statusCode: HTTP_STATUS.BAD_REQUEST };
  }

  if (err.code === '23502') {
    // Not null violation
    const message = 'Required field is missing.';
    error = { message, statusCode: HTTP_STATUS.BAD_REQUEST };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token. Please log in again.';
    error = { message, statusCode: HTTP_STATUS.UNAUTHORIZED };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired. Please log in again.';
    error = { message, statusCode: HTTP_STATUS.UNAUTHORIZED };
  }

  // Validation errors
  if (err.isJoi) {
    const message = err.details[0].message;
    error = { message, statusCode: HTTP_STATUS.BAD_REQUEST };
  }

  res.status(error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;