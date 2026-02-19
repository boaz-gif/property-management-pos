/**
 * Pagination utility for database queries
 * Supports both offset-based and cursor-based pagination
 */

class Pagination {
  /**
   * Parse pagination parameters from request query
   * @param {Object} query - Request query object
   * @param {Object} options - Configuration options
   * @returns {Object} Pagination configuration
   */
  static parseQuery(query, options = {}) {
    const {
      page = 1,
      limit = options.defaultLimit || 20,
      cursor,
      sort = 'created_at',
      order = 'DESC'
    } = query;

    const parsedLimit = Math.min(parseInt(limit, 10) || options.defaultLimit || 20, options.maxLimit || 100);
    
    return {
      offset: cursor ? null : (parseInt(page, 10) - 1) * parsedLimit,
      limit: parsedLimit,
      cursor: cursor || null,
      sort: sort.replace(/[^a-zA-Z0-9_]/g, ''), // Sanitize sort field
      order: order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
      page: parseInt(page, 10)
    };
  }

  /**
   * Build pagination SQL clause
   * @param {Object} pagination - Pagination configuration
   * @returns {Object} SQL clause and parameters
   */
  static buildClause(pagination) {
    const { offset, limit } = pagination;
    
    if (offset !== null) {
      return { 
        clause: ` LIMIT $${pagination.paramIndex || 1} OFFSET $${(pagination.paramIndex || 1) + 1}`, 
        params: [limit, offset] 
      };
    } else {
      return { 
        clause: ` LIMIT $${pagination.paramIndex || 1}`, 
        params: [limit] 
      };
    }
  }

  /**
   * Build ORDER BY clause
   * @param {Object} pagination - Pagination configuration
   * @param {string} defaultSort - Default sort field
   * @returns {string} ORDER BY clause
   */
  static buildOrderBy(pagination, defaultSort = 'created_at') {
    const { sort, order } = pagination;
    const sortField = sort || defaultSort;
    return ` ORDER BY ${sortField} ${order}`;
  }

  /**
   * Get pagination metadata for response
   * @param {Object} pagination - Pagination configuration
   * @param {number} total - Total number of records
   * @param {number} count - Number of records in current page
   * @returns {Object} Pagination metadata
   */
  static getMetadata(pagination, total, count) {
    const { page, limit } = pagination;
    const totalPages = Math.ceil(total / limit);
    
    return {
      currentPage: page,
      totalPages,
      totalRecords: total,
      recordsPerPage: limit,
      recordsInPage: count,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    };
  }

  /**
   * Build cursor-based pagination clause
   * @param {Object} pagination - Pagination configuration
   * @param {string} sortField - Sort field for cursor
   * @returns {Object} SQL clause and parameters
   */
  static buildCursorClause(pagination, sortField = 'created_at') {
    const { cursor, limit, order } = pagination;
    
    if (!cursor) {
      return { clause: ` ORDER BY ${sortField} ${order} LIMIT $1`, params: [limit] };
    }

    const operator = order === 'ASC' ? '>' : '<';
    const clause = ` WHERE ${sortField} ${operator} $1 ORDER BY ${sortField} ${order} LIMIT $2`;
    const params = [cursor, limit];

    return { clause, params };
  }

  /**
   * Get next cursor for cursor-based pagination
   * @param {Array} results - Query results
   * @param {string} sortField - Sort field
   * @returns {string|null} Next cursor or null
   */
  static getNextCursor(results, sortField = 'created_at') {
    if (results.length === 0) return null;
    
    const lastRecord = results[results.length - 1];
    return lastRecord[sortField] || null;
  }

  /**
   * Validate pagination parameters
   * @param {Object} pagination - Pagination configuration
   * @returns {boolean} True if valid
   */
  static validate(pagination) {
    const { page, limit, offset } = pagination;
    
    if (page < 1) return false;
    if (limit < 1 || limit > 100) return false;
    if (offset !== null && offset < 0) return false;
    
    return true;
  }

  /**
   * Apply pagination to a query builder
   * @param {Object} queryBuilder - Query builder object
   * @param {Object} pagination - Pagination configuration
   * @param {string} defaultSort - Default sort field
   * @returns {Object} Modified query builder
   */
  static applyToQuery(queryBuilder, pagination, defaultSort = 'created_at') {
    const { offset, limit, sort, order } = pagination;
    
    // Add ORDER BY
    queryBuilder.orderBy(sort || defaultSort, order);
    
    // Add LIMIT and OFFSET
    queryBuilder.limit(limit);
    if (offset !== null) {
      queryBuilder.offset(offset);
    }
    
    return queryBuilder;
  }
}

module.exports = Pagination;
