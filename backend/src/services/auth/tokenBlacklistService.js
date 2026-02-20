const pool = require('../../config/database');
const jwt = require('jsonwebtoken');
const redisClient = require('../../config/redis');

class TokenBlacklistService {
  /**
   * Add a token to the blacklist
   * @param {string} token - The JWT token to blacklist
   * @param {number} userId - The user ID associated with the token
   * @returns {Promise<Object>} The blacklist entry
   */
  static async blacklistToken(token, userId) {
    try {
      // Decode token to get expiration time
      const decoded = jwt.decode(token);
      const expiresAt = new Date(decoded.exp * 1000);

      const query = `
        INSERT INTO token_blacklist (token, user_id, expires_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (token) DO UPDATE
        SET blacklisted_at = NOW()
        RETURNING id, token, user_id, blacklisted_at, expires_at;
      `;

      const result = await pool.query(query, [token, userId, expiresAt]);
      
      // Invalidate the blacklist cache so the token is checked from DB
      const cacheKey = `pms:blacklist:${token}`;
      try {
        await redisClient.del(cacheKey);
      } catch (cacheError) {
        console.warn('Failed to invalidate blacklist cache:', cacheError.message);
      }
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to blacklist token: ${error.message}`);
    }
  }

  /**
   * Check if a token is blacklisted
   * @param {string} token - The JWT token to check
   * @returns {Promise<boolean>} True if token is blacklisted, false otherwise
   */
  static async isTokenBlacklisted(token) {
    try {
      const query = `
        SELECT id FROM token_blacklist 
        WHERE token = $1 AND expires_at > NOW()
        LIMIT 1;
      `;

      const result = await pool.query(query, [token]);
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Failed to check token blacklist: ${error.message}`);
    }
  }

  /**
   * Get all blacklisted tokens for a user
   * @param {number} userId - The user ID
   * @returns {Promise<Array>} Array of blacklisted tokens
   */
  static async getUserBlacklistedTokens(userId) {
    try {
      const query = `
        SELECT id, token, blacklisted_at, expires_at
        FROM token_blacklist 
        WHERE user_id = $1 AND expires_at > NOW()
        ORDER BY blacklisted_at DESC;
      `;

      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to get user blacklisted tokens: ${error.message}`);
    }
  }

  /**
   * Clean up expired tokens from blacklist
   * @returns {Promise<number>} Number of deleted tokens
   */
  static async cleanupExpiredTokens() {
    try {
      const query = `
        DELETE FROM token_blacklist 
        WHERE expires_at <= NOW()
        RETURNING id;
      `;

      const result = await pool.query(query);
      return result.rows.length;
    } catch (error) {
      throw new Error(`Failed to cleanup expired tokens: ${error.message}`);
    }
  }

  /**
   * Blacklist all tokens for a user (logout all devices)
   * @param {number} userId - The user ID
   * @returns {Promise<number>} Number of tokens blacklisted
   */
  static async blacklistAllUserTokens(userId) {
    try {
      // This would require keeping track of all issued tokens per user
      // For now, we'll just update the user's token version to invalidate all tokens
      const query = `
        UPDATE users 
        SET token_version = token_version + 1
        WHERE id = $1
        RETURNING id, token_version;
      `;

      const result = await pool.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to blacklist all user tokens: ${error.message}`);
    }
  }

  /**
   * Get blacklist statistics
   * @returns {Promise<Object>} Statistics about the blacklist
   */
  static async getBlacklistStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_blacklisted,
          COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_blacklisted,
          COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_blacklisted,
          MAX(blacklisted_at) as last_blacklist_time
        FROM token_blacklist;
      `;

      const result = await pool.query(query);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to get blacklist stats: ${error.message}`);
    }
  }
}

module.exports = TokenBlacklistService;
