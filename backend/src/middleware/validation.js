const Joi = require('joi');
const { HTTP_STATUS } = require('../utils/constants');

// Helper to validate request body against schema
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      // Format error messages
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: errorMessage
      });
    }
    
    next();
  };
};

// Schemas
const schemas = {
  // Auth
  register: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('admin', 'tenant', 'super_admin').required(),
    // Optional fields depending on role
    property_id: Joi.number().integer().optional(),
    unit: Joi.string().optional()
  }),
  
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  // Tenants
  createTenant: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    property_id: Joi.number().integer().required(),
    unit: Joi.string().required(),
    rent: Joi.number().positive().required(),
    move_in: Joi.date().iso().required()
  }),

  // Payments
  createPayment: Joi.object({
    tenantId: Joi.number().integer().required(),
    amount: Joi.number().positive().required(),
    method: Joi.string().valid('cash', 'card', 'bank_transfer').required(),
    type: Joi.string().valid('rent', 'deposit', 'fee').default('rent')
  }),

  // Maintenance
  createMaintenance: Joi.object({
    title: Joi.string().min(3).max(100).required(),
    priority: Joi.string().valid('low', 'medium', 'high').default('medium')
  })
};

module.exports = {
  validate,
  schemas
};
