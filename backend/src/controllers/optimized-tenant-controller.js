const Tenant = require('../models/Tenant');
const responseOptimizer = require('../middleware/response-optimizer');

class OptimizedTenantController {
  // Get all tenants with full optimization
  static async getAllTenants(req, res) {
    try {
      const result = await Tenant.findAll(req.user, req.query);
      
      // Apply field selection if requested
      if (req.selectedFields) {
        result.data = responseOptimizer.filterFields(result.data, req.selectedFields);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Get tenants error:', error);
      res.status(500).json({ error: 'Failed to fetch tenants' });
    }
  }

  // Get tenant by ID with optimization
  static async getTenantById(req, res) {
    try {
      const { id } = req.params;
      const tenant = await Tenant.findById(id, req.user);
      
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      
      // Apply field selection if requested
      const filteredTenant = req.selectedFields 
        ? responseOptimizer.filterFields(tenant, req.selectedFields)
        : tenant;
      
      res.json(filteredTenant);
    } catch (error) {
      console.error('Get tenant error:', error);
      if (error.message === 'Access denied') {
        return res.status(403).json({ error: 'Access denied' });
      }
      res.status(500).json({ error: 'Failed to fetch tenant' });
    }
  }

  // Create tenant with cache invalidation
  static async createTenant(req, res) {
    try {
      const tenant = await Tenant.create(req.body, req.user.id);
      
      // Invalidate relevant caches
      await responseOptimizer.invalidateCache(`/api/tenants`);
      
      res.status(201).json(tenant);
    } catch (error) {
      console.error('Create tenant error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // Update tenant with cache invalidation
  static async updateTenant(req, res) {
    try {
      const { id } = req.params;
      const tenant = await Tenant.update(id, req.body, req.user);
      
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      
      // Invalidate relevant caches
      await responseOptimizer.invalidateCache(`/api/tenants`);
      await responseOptimizer.invalidateCache(`/api/tenants/${id}`);
      
      res.json(tenant);
    } catch (error) {
      console.error('Update tenant error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // Delete tenant with cache invalidation
  static async deleteTenant(req, res) {
    try {
      const { id } = req.params;
      const success = await Tenant.delete(id, req.user);
      
      if (!success) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      
      // Invalidate relevant caches
      await responseOptimizer.invalidateCache(`/api/tenants`);
      await responseOptimizer.invalidateCache(`/api/tenants/${id}`);
      
      res.status(204).send();
    } catch (error) {
      console.error('Delete tenant error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // Get tenant statistics with optimization
  static async getTenantStats(req, res) {
    try {
      const stats = await Tenant.getTenantStats(req.user);
      res.json(stats);
    } catch (error) {
      console.error('Get tenant stats error:', error);
      res.status(500).json({ error: 'Failed to fetch tenant statistics' });
    }
  }
}

module.exports = OptimizedTenantController;
