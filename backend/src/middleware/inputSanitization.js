const { body, validationResult, param, query } = require('express-validator');
const xss = require('xss');

/**
 * Sanitize input strings to prevent XSS attacks
 * @param {string} value - Value to sanitize
 * @returns {string} Sanitized value
 */
function sanitizeInput(value) {
  if (typeof value !== 'string') {
    return value;
  }
  // Remove potentially dangerous characters and scripts
  return xss(value, {
    whiteList: {}, // No HTML allowed
    stripIgnoredTag: true,
    stripLeadingAndTrailingWhitespace: true
  });
}

/**
 * Trim and normalize strings
 * @param {string} value - Value to normalize
 * @returns {string} Normalized value
 */
function normalizeString(value) {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim().toLowerCase();
}

/**
 * Middleware to handle validation errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

/**
 * Sanitize all request inputs
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
const sanitizeAll = (req, res, next) => {
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeInput(req.body[key]);
      }
    });
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeInput(req.query[key]);
      }
    });
  }

  // Sanitize URL parameters
  if (req.params && typeof req.params === 'object') {
    Object.keys(req.params).forEach(key => {
      if (typeof req.params[key] === 'string') {
        req.params[key] = sanitizeInput(req.params[key]);
      }
    });
  }

  next();
};

/**
 * Validation schemas for common inputs
 */
const validationSchemas = {
  // Email validation
  email: body('email')
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),

  // Password validation (minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number)
  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and numbers'),

  // Name validation
  name: body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s\-']+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),

  // Phone number validation
  phone: body('phone')
    .trim()
    .optional()
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('Invalid phone number format'),

  // URL validation
  url: body('url')
    .trim()
    .optional()
    .isURL()
    .withMessage('Invalid URL'),

  // Integer validation
  integer: (field) => body(field)
    .isInt()
    .withMessage(`${field} must be an integer`),

  // Positive integer validation
  positiveInteger: (field) => body(field)
    .isInt({ min: 1 })
    .withMessage(`${field} must be a positive integer`),

  // Date validation (YYYY-MM-DD)
  date: body('date')
    .trim()
    .isISO8601()
    .withMessage('Invalid date format. Use YYYY-MM-DD'),

  // Boolean validation
  boolean: (field) => body(field)
    .isBoolean()
    .withMessage(`${field} must be a boolean`),

  // String with length constraints
  string: (field, minLength = 1, maxLength = 255) => body(field)
    .trim()
    .isLength({ min: minLength, max: maxLength })
    .withMessage(`${field} must be between ${minLength} and ${maxLength} characters`)
};

/**
 * Auth validation schema
 */
const authValidation = {
  register: [
    validationSchemas.name,
    validationSchemas.email,
    validationSchemas.password,
    body('confirmPassword')
      .custom((value, { req }) => value === req.body.password)
      .withMessage('Passwords do not match')
  ],

  login: [
    validationSchemas.email,
    body('password').notEmpty().withMessage('Password is required')
  ],

  changePassword: [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    validationSchemas.password,
    body('confirmPassword')
      .custom((value, { req }) => value === req.body.password)
      .withMessage('Passwords do not match')
  ]
};

/**
 * Property validation schema
 */
const propertyValidation = {
  create: [
    validationSchemas.string('name', 2, 100),
    validationSchemas.string('address', 5, 255),
    validationSchemas.string('city', 2, 50),
    validationSchemas.string('state', 2, 50),
    validationSchemas.string('zipCode', 3, 20),
    validationSchemas.string('description', 0, 1000),
    body('bedrooms').optional().isInt({ min: 0 }).withMessage('Bedrooms must be a non-negative integer'),
    body('bathrooms').optional().isInt({ min: 0 }).withMessage('Bathrooms must be a non-negative integer'),
    body('rentAmount').optional().isDecimal({ decimal_digits: '1,2' }).withMessage('Rent amount must be a valid decimal')
  ],

  update: [
    validationSchemas.string('name', 2, 100).optional(),
    validationSchemas.string('address', 5, 255).optional(),
    validationSchemas.string('city', 2, 50).optional(),
    validationSchemas.string('state', 2, 50).optional(),
    validationSchemas.string('zipCode', 3, 20).optional(),
    validationSchemas.string('description', 0, 1000).optional()
  ]
};

/**
 * Tenant validation schema
 */
const tenantValidation = {
  create: [
    validationSchemas.name,
    validationSchemas.email,
    body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
    validationSchemas.date,
    body('rentAmount').optional().isDecimal({ decimal_digits: '1,2' }).withMessage('Rent amount must be valid'),
    validationSchemas.positiveInteger('propertyId')
  ]
};

module.exports = {
  sanitizeInput,
  normalizeString,
  sanitizeAll,
  handleValidationErrors,
  validationSchemas,
  authValidation,
  propertyValidation,
  tenantValidation
};
