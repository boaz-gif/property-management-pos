const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { USER_ROLES, HTTP_STATUS } = require('../utils/constants');

class AuthService {
  static async register(userData) {
    const { email } = userData;
    
    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }
    
    // Create new user
    const user = await User.create(userData);
    
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
    const user = await User.findById(decoded.id);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Generate new token
    const newToken = this.generateToken(user);
    
    return {
      user,
      token: newToken
    };
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