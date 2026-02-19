const Property = require('../../models/Property');
const { PROPERTY_STATUS, HTTP_STATUS } = require('../../utils/constants');
const cacheService = require('../../utils/cacheService');
const { getFlag } = require('../../utils/featureFlags');

class PropertyService {
  static async getAllProperties(user) {
    const cacheKey = `properties:list:${user.id}`;
    if (getFlag('REDIS_CACHE_READS')) {
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;
    }

    const properties = await Property.findAll(user);
    
    // Calculate occupancy percentage for each property
    const propertiesWithStats = properties.map(property => ({
      ...property,
      occupancy_rate: property.units > 0 ? 
        Math.round((property.active_tenants / property.units) * 100) : 0,
      available_units: property.units - property.active_tenants
    }));
    
    if (getFlag('REDIS_CACHE_READS')) {
      await cacheService.set(cacheKey, propertiesWithStats, 60); // 60s stats cache
    }

    return propertiesWithStats;
  }

  static async getPropertyById(id, user) {
    const propertyId = parseInt(id);
    const property = await Property.findById(propertyId, user);
    
    if (!property) {
      throw new Error('Property not found');
    }
    
    // Add calculated fields
    return {
      ...property,
      occupancy_rate: property.units > 0 ? 
        Math.round((property.active_tenants / property.units) * 100) : 0,
      available_units: property.units - property.active_tenants
    };
  }

  static async createProperty(propertyData, user) {
    const { role, id } = user;
    
    // Only super_admin and admin can create properties
    if (role === 'tenant') {
      throw new Error('Access denied');
    }
    
    // Validate required fields
    const requiredFields = ['name', 'address', 'units', 'rent'];
    for (const field of requiredFields) {
      if (propertyData[field] === undefined || propertyData[field] === '' || propertyData[field] === null) {
        throw new Error(`${field} is required`);
      }
    }
    
    // Validate data types and ranges
    if (parseFloat(propertyData.units) <= 0) {
      throw new Error('Units must be greater than 0');
    }
    
    if (parseFloat(propertyData.rent) <= 0) {
      throw new Error('Rent must be greater than 0');
    }
    
    // Set admin_id based on user role
    propertyData.admin_id = id;
    
    const property = await Property.create(propertyData, id);
    
    if (getFlag('REDIS_CACHE_READS')) {
      await cacheService.delPattern('properties:list:*');
    }

    return property;
  }

  static async updateProperty(id, propertyData, user) {
    const { role } = user;
    
    // Only super_admin and admin can update properties
    if (role === 'tenant') {
      throw new Error('Access denied');
    }
    
    // Check if there's anything to update
    if (Object.keys(propertyData).length === 0) {
      throw new Error('No data provided for update');
    }

    // Validate data types and ranges if provided
    if (propertyData.units !== undefined && propertyData.units <= 0) {
      throw new Error('Units must be greater than 0');
    }
    
    if (propertyData.rent !== undefined && propertyData.rent <= 0) {
      throw new Error('Rent must be greater than 0');
    }
    
    const property = await Property.update(id, propertyData, user);
    
    if (!property) {
      throw new Error('Property not found');
    }
    
    if (getFlag('REDIS_CACHE_READS')) {
      await cacheService.delPattern('properties:list:*');
    }

    return property;
  }

  static async deleteProperty(id, user) {
    const { role } = user;
    
    // Only super_admin and admin can delete properties
    if (role === 'tenant') {
      throw new Error('Access denied');
    }
    
    await Property.delete(id, user);
    
    if (getFlag('REDIS_CACHE_READS')) {
      await cacheService.delPattern('properties:list:*');
    }

    return { message: 'Property deleted successfully' };
  }

  static async getPropertyStats(user) {
    const stats = await Property.getStats(user);
    
    return {
      total_properties: parseInt(stats.total_properties) || 0,
      active_properties: parseInt(stats.active_properties) || 0,
      total_units: parseInt(stats.total_units) || 0,
      total_occupied: parseInt(stats.total_occupied) || 0,
      occupancy_rate: parseFloat(stats.occupancy_rate) || 0,
      avg_rent: parseFloat(stats.avg_rent) || 0
    };
  }

  /* Removed: Managed by DB View
  static async updatePropertyOccupancy(propertyId) {
    const property = await Property.updateOccupancy(propertyId);
    return property;
  }
  */

  static async searchProperties(query, user) {
    const properties = await Property.findAll(user);
    const filtered = properties.filter(p => 
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.address.toLowerCase().includes(query.toLowerCase())
    );
    return filtered;
  }

  static async exportPropertiesToCSV(user) {
    const properties = await Property.findAll(user);
    const csvHeaders = 'ID,Name,Address,Units,Rent,Occupancy\n';
    const csvRows = properties.map(p => 
      `${p.id},"${p.name}","${p.address}",${p.units},${p.rent},${p.occupancy}`
    ).join('\n');
    return csvHeaders + csvRows;
  }
}

module.exports = PropertyService;
