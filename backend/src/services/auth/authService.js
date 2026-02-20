const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Tenant = require('../../models/Tenant');
const { USER_ROLES, HTTP_STATUS } = require('../../utils/constants');

class AuthService {
  static async register(userData) {
    const { email, role, property_id, unit, rent, move_in } = userData;
    
    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }
    
    // Create new user
    const user = await User.create(userData);
    
    // If registering a tenant, also create tenant record
    if (role === USER_ROLES.TENANT) {
      const tenantData = {
        name: userData.name,
        email: userData.email,
        property_id: property_id,
        unit: unit,
        rent: rent || 0,
        move_in: move_in || new Date().toISOString().split('T')[0],
        status: 'active',
        user_id: user.id  // PHASE 1 FIX: Link tenant to user by ID
      };
      await Tenant.create(tenantData, user.id);
    }
    
    // Generate JWT token
    const token = this.generateToken(user);
    
    // Return user data without password
    const { password, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword,
      token
    };
  }

  static async login(email, password) {
    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    // Validate password
    const isValidPassword = await User.validatePassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }
    
    // Update last login
    await User.updateLastLogin(user.id);
    
    // Generate JWT token
    const token = this.generateToken(user);
    
    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword,
      token
    };
  }

  static generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      properties: user.properties,
      property_id: user.property_id,
      unit: user.unit
    };
    
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    });
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  static async refreshToken(token) {
    const decoded = this.verifyToken(token);
    
    const newToken = jwt.sign(
        {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            properties: decoded.properties,
            property_id: decoded.property_id,
            unit: decoded.unit
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
    
    return { user: decoded, token: newToken };
  }

  static async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findByIdWithPassword(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Validate current password
    const isValidPassword = await User.validatePassword(currentPassword, user.password);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }
    
    // Update password
    await User.updatePassword(userId, newPassword);
    
    return { message: 'Password updated successfully' };
  }
}

module.exports = AuthService;