const Property = require('../models/Property');
const { PROPERTY_STATUS, HTTP_STATUS } = require('../utils/constants');

class PropertyService {
  static async getAllProperties(user) {
    const { role, properties: userProperties } = user;
    
    const properties = await Property.findAll(role, userProperties);
    
    // Calculate occupancy percentage for each property
    const propertiesWithStats = properties.map(property => ({
      ...property,
      occupancy_rate: property.units > 0 ? 
        Math.round((property.active_tenants / property.units) * 100) : 0,
      available_units: property.units - property.active_tenants
    }));
    
    return propertiesWithStats;
  }

  static async getPropertyById(id, user) {
    const { role, properties: userProperties } = user;
    
    const property = await Property.findById(id, role, userProperties);
    
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
    const { role } = user;
    
    // Only super_admin and admin can create properties
    if (role === 'tenant') {
      throw new Error('Access denied');
    }
    
    // Validate required fields
    const requiredFields = ['name', 'address', 'units', 'rent'];
    for (const field of requiredFields) {
      if (!propertyData[field]) {
        throw new Error(`${field} is required`);
      }
    }
    
    // Validate data types and ranges
    if (propertyData.units <= 0) {
      throw new Error('Units must be greater than 0');
    }
    
    if (propertyData.rent <= 0) {
      throw new Error('Rent must be greater than 0');
    }
    
    // Set admin_id based on user role
    if (role === 'admin') {
      propertyData.admin_id = user.id;
    }
    
    const property = await Property.create(propertyData, user.id);
    
    return property;
  }

  static async updateProperty(id, propertyData, user) {
    const { role, properties: userProperties } = user;
    
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
    
    const property = await Property.update(id, propertyData, role, userProperties);
    
    if (!property) {
      throw new Error('Property not found');
    }
    
    return property;
  }

  static async deleteProperty(id, user) {
    const { role, properties: userProperties } = user;
    
    // Only super_admin and admin can delete properties
    if (role === 'tenant') {
      throw new Error('Access denied');
    }
    
    await Property.delete(id, role, userProperties);
    
    return { message: 'Property deleted successfully' };
  }

  static async getPropertyStats(user) {
    const { role, properties: userProperties } = user;
    
    const stats = await Property.getStats(role, userProperties);
    
    return {
      total_properties: parseInt(stats.total_properties) || 0,
      active_properties: parseInt(stats.active_properties) || 0,
      total_units: parseInt(stats.total_units) || 0,
      total_occupied: parseInt(stats.total_occupied) || 0,
      occupancy_rate: parseFloat(stats.occupancy_rate) || 0,
      avg_rent: parseFloat(stats.avg_rent) || 0
    };
  }

  static async updatePropertyOccupancy(propertyId) {
    const property = await Property.updateOccupancy(propertyId);
    return property;
  }
}

module.exports = PropertyService;