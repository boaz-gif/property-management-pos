const Database = require('../../utils/database');
const Cache = require('../../utils/cache');

class AdminDashboardService {
  constructor() {
    this.db = Database;
  }

  // Get comprehensive dashboard overview
  async getDashboardOverview(adminId) {
    try {
      const cacheKey = Cache.generateKey('admin_dashboard', 'overview', { adminId });
      
      return await Cache.cacheQuery(cacheKey, async () => {
        // Get current metrics
        const currentMetrics = await this.getCurrentMetrics(adminId);
        
        // Get action items
        const actionItems = await this.getActionItemsSummary(adminId);
        
        // Get property comparison
        const propertyComparison = await this.getPropertiesComparison(adminId, {
          metric: 'occupancy_rate',
          period: 'current_month'
        });
        
        // Get recent activity
        const recentActivity = await this.getRecentActivity({
          adminId,
          limit: 10
        });
        
        // Get financial summary
        const financialSummary = await this.getFinancialSummary(adminId, {
          period: 'current_month'
        });

        return {
          metrics: currentMetrics,
          actionItems,
          propertyComparison,
          recentActivity,
          financialSummary,
          lastUpdated: new Date().toISOString()
        };
      }, 300); // 5 minute cache
    } catch (error) {
      console.error('Error in getDashboardOverview:', error);
      throw error;
    }
  }

  // Get current admin metrics
  async getCurrentMetrics(adminId) {
    const query = `
      SELECT 
        total_properties,
        total_units,
        occupied_units,
        vacant_units,
        occupancy_rate,
        monthly_revenue,
        collected_revenue,
        pending_revenue,
        collection_rate,
        total_expenses,
        net_income,
        active_maintenance_requests,
        overdue_maintenance_requests,
        avg_maintenance_resolution_hours,
        total_tenants,
        new_tenants_this_month,
        churned_tenants_this_month,
        leases_expiring_30_days,
        leases_expiring_60_days,
        late_payments_count,
        urgent_maintenance_count
      FROM admin_dashboard_metrics 
      WHERE admin_id = $1 
        AND metric_date = CURRENT_DATE
    `;
    
    const result = await this.db.query(query, [adminId]);
    
    if (result.rows.length === 0) {
      // Generate metrics if not found
      await this.generateMetricsForAdmin(adminId);
      return this.getCurrentMetrics(adminId);
    }
    
    return result.rows[0];
  }

  // Get properties comparison data
  async getPropertiesComparison(adminId, options = {}) {
    const { metric = 'occupancy_rate', period = 'current_month' } = options;
    
    let dateFilter = '';
    switch (period) {
      case 'current_month':
        dateFilter = "AND metric_date >= DATE_TRUNC('month', CURRENT_DATE)";
        break;
      case 'last_month':
        dateFilter = "AND metric_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AND metric_date < DATE_TRUNC('month', CURRENT_DATE)";
        break;
      case 'current_quarter':
        dateFilter = "AND metric_date >= DATE_TRUNC('quarter', CURRENT_DATE)";
        break;
      case 'current_year':
        dateFilter = "AND metric_date >= DATE_TRUNC('year', CURRENT_DATE)";
        break;
      default:
        dateFilter = "AND metric_date >= DATE_TRUNC('month', CURRENT_DATE)";
    }

    const query = `
      SELECT 
        pm.property_id,
        p.name as property_name,
        p.address as property_address,
        pm.occupancy_rate,
        pm.revenue,
        pm.collected,
        pm.collection_rate,
        pm.expenses,
        pm.net_operating_income,
        pm.maintenance_requests,
        pm.avg_resolution_time_hours,
        pm.avg_tenant_satisfaction,
        pm.renewal_rate
      FROM property_metrics pm
      JOIN properties p ON pm.property_id = p.id
      WHERE p.admin_id = $1 
        AND p.deleted_at IS NULL
        ${dateFilter}
      ORDER BY ${this.getMetricOrderBy(metric)} DESC
      LIMIT 20
    `;
    
    const result = await this.db.query(query, [adminId]);
    
    // Calculate rankings and insights
    const properties = result.rows;
    const portfolioAvg = this.calculatePortfolioAverages(properties);
    
    return {
      properties,
      portfolioAverage: portfolioAvg,
      topPerformer: properties[0] || null,
      worstPerformer: properties[properties.length - 1] || null,
      insights: this.generateComparisonInsights(properties, portfolioAvg, metric)
    };
  }

  // Get action items with pagination and filtering
  async getActionItems(filters = {}) {
    const {
      adminId,
      status,
      priority,
      type,
      propertyId,
      page = 1,
      limit = 20
    } = filters;
    
    let whereConditions = ['admin_id = $1'];
    let params = [adminId];
    let paramIndex = 2;
    
    if (status) {
      whereConditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    
    if (priority) {
      whereConditions.push(`priority = $${paramIndex++}`);
      params.push(priority);
    }
    
    if (type) {
      whereConditions.push(`item_type = $${paramIndex++}`);
      params.push(type);
    }
    
    if (propertyId) {
      whereConditions.push(`property_id = $${paramIndex++}`);
      params.push(propertyId);
    }
    
    const whereClause = whereConditions.join(' AND ');
    const offset = (page - 1) * limit;
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM admin_action_items 
      WHERE ${whereClause}
    `;
    const countResult = await this.db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);
    
    // Get paginated results
    const query = `
      SELECT 
        id,
        item_type,
        priority,
        title,
        description,
        status,
        due_date,
        created_at,
        metadata,
        property_id,
        tenant_id,
        (SELECT name FROM properties WHERE id = property_id) as property_name,
        (SELECT name FROM tenants WHERE id = tenant_id) as tenant_name
      FROM admin_action_items 
      WHERE ${whereClause}
      ORDER BY 
        CASE priority 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        due_date ASC NULLS LAST,
        created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    
    params.push(limit, offset);
    const result = await this.db.query(query, params);
    
    return {
      items: result.rows,
      pagination: {
        currentPage: page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  // Get action items summary (counts by priority and type)
  async getActionItemsSummary(adminId) {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE priority = 'critical') as critical,
        COUNT(*) FILTER (WHERE priority = 'high') as high,
        COUNT(*) FILTER (WHERE priority = 'medium') as medium,
        COUNT(*) FILTER (WHERE priority = 'low') as low,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'completed') as overdue
      FROM admin_action_items 
      WHERE admin_id = $1 AND status != 'completed' AND status != 'dismissed'
    `;
    
    const result = await this.db.query(query, [adminId]);
    return result.rows[0];
  }

  // Get specific action item by ID
  async getActionItemById(id, adminId) {
    const query = `
      SELECT 
        aai.*,
        p.name as property_name,
        t.name as tenant_name
      FROM admin_action_items aai
      LEFT JOIN properties p ON aai.property_id = p.id
      LEFT JOIN tenants t ON aai.tenant_id = t.id
      WHERE aai.id = $1 AND aai.admin_id = $2
    `;
    
    const result = await this.db.query(query, [id, adminId]);
    return result.rows[0] || null;
  }

  // Complete action item
  async completeActionItem(id, adminId, notes = null) {
    const query = `
      UPDATE admin_action_items 
      SET 
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = $1 AND admin_id = $2
      RETURNING *
    `;
    
    const result = await this.db.query(query, [id, adminId]);
    
    if (result.rows.length === 0) {
      throw new Error('Action item not found or access denied');
    }
    
    return result.rows[0];
  }

  // Dismiss action item
  async dismissActionItem(id, adminId, reason) {
    const query = `
      UPDATE admin_action_items 
      SET 
        status = 'dismissed',
        dismissed_at = NOW(),
        dismissal_reason = $3,
        updated_at = NOW()
      WHERE id = $1 AND admin_id = $2
      RETURNING *
    `;
    
    const result = await this.db.query(query, [id, adminId, reason]);
    
    if (result.rows.length === 0) {
      throw new Error('Action item not found or access denied');
    }
    
    return result.rows[0];
  }

  // Get recent activity
  async getRecentActivity(filters = {}) {
    const {
      adminId,
      propertyId,
      limit = 50,
      startDate,
      endDate
    } = filters;
    
    let whereConditions = ['p.admin_id = $1'];
    let params = [adminId];
    let paramIndex = 2;
    
    if (propertyId) {
      whereConditions.push(`p.id = $${paramIndex++}`);
      params.push(propertyId);
    }
    
    if (startDate) {
      whereConditions.push(`activity_date >= $${paramIndex++}`);
      params.push(startDate);
    }
    
    if (endDate) {
      whereConditions.push(`activity_date <= $${paramIndex++}`);
      params.push(endDate);
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    const query = `
      SELECT 
        'payment' as activity_type,
        pm.amount,
        pm.date as activity_date,
        t.name as tenant_name,
        p.name as property_name,
        p.address as property_address,
        pm.status,
        'Payment received' as description
      FROM payments pm
      JOIN tenants t ON pm.tenant_id = t.id
      JOIN properties p ON t.property_id = p.id
      WHERE ${whereClause}
      
      UNION ALL
      
      SELECT 
        'maintenance' as activity_type,
        NULL as amount,
        m.date as activity_date,
        t.name as tenant_name,
        p.name as property_name,
        p.address as property_address,
        m.status,
        'Maintenance request: ' || m.title as description
      FROM maintenance m
      JOIN tenants t ON m.tenant_id = t.id
      JOIN properties p ON m.property_id = p.id
      WHERE ${whereClause}
      
      UNION ALL
      
      SELECT 
        'tenant_move_in' as activity_type,
        t.rent as amount,
        t.move_in as activity_date,
        t.name as tenant_name,
        p.name as property_name,
        p.address as property_address,
        'active' as status,
        'Tenant moved in' as description
      FROM tenants t
      JOIN properties p ON t.property_id = p.id
      WHERE ${whereClause} AND t.move_in IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'tenant_move_out' as activity_type,
        NULL as amount,
        t.updated_at as activity_date,
        t.name as tenant_name,
        p.name as property_name,
        p.address as property_address,
        'inactive' as status,
        'Tenant moved out' as description
      FROM tenants t
      JOIN properties p ON t.property_id = p.id
      WHERE ${whereClause} AND t.status = 'inactive' AND t.updated_at != t.created_at
      
      ORDER BY activity_date DESC
      LIMIT $${paramIndex++}
    `;
    
    params.push(limit);
    const result = await this.db.query(query, params);
    
    return result.rows;
  }

  // Get financial summary
  async getFinancialSummary(adminId, options = {}) {
    const { period = 'current_month', propertyId } = options;
    
    let dateFilter = '';
    let propertyFilter = '';
    let params = [adminId];
    let paramIndex = 2;
    
    switch (period) {
      case 'current_month':
        dateFilter = "AND pm.date >= DATE_TRUNC('month', CURRENT_DATE)";
        break;
      case 'last_month':
        dateFilter = "AND pm.date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AND pm.date < DATE_TRUNC('month', CURRENT_DATE)";
        break;
      case 'current_quarter':
        dateFilter = "AND pm.date >= DATE_TRUNC('quarter', CURRENT_DATE)";
        break;
      case 'current_year':
        dateFilter = "AND pm.date >= DATE_TRUNC('year', CURRENT_DATE)";
        break;
      default:
        dateFilter = "AND pm.date >= DATE_TRUNC('month', CURRENT_DATE)";
    }
    
    if (propertyId) {
      propertyFilter = "AND p.id = $" + (paramIndex++);
      params.push(propertyId);
    }
    
    const query = `
      SELECT 
        COALESCE(SUM(pm.amount), 0) as total_revenue,
        COALESCE(SUM(pm.amount) FILTER (WHERE pm.status = 'completed'), 0) as collected_revenue,
        COALESCE(SUM(pm.amount) FILTER (WHERE pm.status = 'pending'), 0) as pending_revenue,
        COUNT(pm.id) as total_payments,
        COUNT(pm.id) FILTER (WHERE pm.status = 'completed') as completed_payments,
        COUNT(DISTINCT pm.tenant_id) as paying_tenants,
        COUNT(DISTINCT t.id) as total_tenants,
        COALESCE(SUM(pe.amount), 0) as total_expenses
      FROM payments pm
      JOIN tenants t ON pm.tenant_id = t.id
      JOIN properties p ON t.property_id = p.id
      LEFT JOIN property_expenses pe ON p.id = pe.property_id AND pe.deleted_at IS NULL
      WHERE p.admin_id = $1 
        AND pm.deleted_at IS NULL 
        AND t.deleted_at IS NULL 
        AND p.deleted_at IS NULL
        ${dateFilter}
        ${propertyFilter}
    `;
    
    const result = await this.db.query(query, params);
    const data = result.rows[0];
    
    // Calculate derived metrics
    const collectionRate = data.total_revenue > 0 ? (data.collected_revenue / data.total_revenue) * 100 : 0;
    const netIncome = data.collected_revenue - data.total_expenses;
    
    return {
      totalRevenue: parseFloat(data.total_revenue),
      collectedRevenue: parseFloat(data.collected_revenue),
      pendingRevenue: parseFloat(data.pending_revenue),
      collectionRate: parseFloat(collectionRate.toFixed(2)),
      totalExpenses: parseFloat(data.total_expenses),
      netIncome: parseFloat(netIncome),
      totalPayments: parseInt(data.total_payments),
      completedPayments: parseInt(data.completed_payments),
      payingTenants: parseInt(data.paying_tenants),
      totalTenants: parseInt(data.total_tenants),
      period
    };
  }

  // Get quick stats (lightweight endpoint for frequent polling)
  async getQuickStats(adminId) {
    const cacheKey = Cache.generateKey('admin_dashboard', 'quick_stats', { adminId });
    
    return await Cache.cacheQuery(cacheKey, async () => {
      const query = `
        SELECT 
          COUNT(DISTINCT p.id) as total_properties,
          COALESCE(SUM(p.units), 0) as total_units,
          COALESCE(COUNT(t.id) FILTER (WHERE t.status = 'active'), 0) as occupied_units,
          COALESCE(SUM(pm.amount) FILTER (WHERE pm.status = 'completed'), 0) as collected_revenue,
          COUNT(m.id) FILTER (WHERE m.status = 'open') as active_maintenance,
          COUNT(aai.id) FILTER (WHERE aai.status = 'pending' AND aai.priority IN ('critical', 'high')) as urgent_actions
        FROM properties p
        LEFT JOIN tenants t ON p.id = t.property_id AND t.deleted_at IS NULL
        LEFT JOIN payments pm ON t.id = pm.tenant_id AND pm.deleted_at IS NULL AND pm.status = 'completed'
        LEFT JOIN maintenance m ON p.id = m.property_id AND m.deleted_at IS NULL
        LEFT JOIN admin_action_items aai ON p.admin_id = aai.admin_id AND aai.status != 'completed'
        WHERE p.admin_id = $1 AND p.deleted_at IS NULL
      `;
      
      const result = await this.db.query(query, [adminId]);
      const data = result.rows[0];
      
      const occupancyRate = data.total_units > 0 ? (data.occupied_units / data.total_units) * 100 : 0;
      
      return {
        totalProperties: parseInt(data.total_properties),
        totalUnits: parseInt(data.total_units),
        occupiedUnits: parseInt(data.occupied_units),
        occupancyRate: parseFloat(occupancyRate.toFixed(2)),
        collectedRevenue: parseFloat(data.collected_revenue),
        activeMaintenance: parseInt(data.active_maintenance),
        urgentActions: parseInt(data.urgent_actions)
      };
    }, 120); // 2 minute cache
  }

  // Refresh metrics for admin
  async refreshMetrics(adminId, force = false) {
    const cacheKey = Cache.generateKey('admin_dashboard', 'overview', { adminId });
    
    // Clear cache
    await Cache.delete(cacheKey);
    
    // Generate fresh metrics
    await this.generateMetricsForAdmin(adminId);
    
    // Generate action items
    await this.generateActionItems(adminId);
    
    return await this.getDashboardOverview(adminId);
  }

  // Generate metrics for admin
  async generateMetricsForAdmin(adminId) {
    const query = 'SELECT calculate_admin_dashboard_metrics($1, CURRENT_DATE)';
    await this.db.query(query, [adminId]);
  }

  // Generate action items for admin
  async generateActionItems(adminId) {
    // Check for overdue payments
    const overduePaymentsQuery = `
      INSERT INTO admin_action_items (admin_id, tenant_id, property_id, item_type, priority, title, description, due_date, metadata)
      SELECT 
        p.admin_id,
        t.id,
        p.id,
        'payment_overdue',
        CASE 
          WHEN pm.date < CURRENT_DATE - INTERVAL '14 days' THEN 'critical'
          WHEN pm.date < CURRENT_DATE - INTERVAL '7 days' THEN 'high'
          ELSE 'medium'
        END,
        'Overdue Payment: ' || t.name,
        'Payment of $' || pm.amount || ' is overdue by ' || (CURRENT_DATE - pm.date) || ' days',
        pm.date + INTERVAL '5 days',
        json_build_object('amount', pm.amount, 'due_date', pm.date, 'days_overdue', CURRENT_DATE - pm.date)
      FROM payments pm
      JOIN tenants t ON pm.tenant_id = t.id
      JOIN properties p ON t.property_id = p.id
      WHERE p.admin_id = $1 
        AND pm.status = 'pending' 
        AND pm.date < CURRENT_DATE - INTERVAL '5 days'
        AND NOT EXISTS (
          SELECT 1 FROM admin_action_items aai 
          WHERE aai.tenant_id = t.id 
            AND aai.item_type = 'payment_overdue' 
            AND aai.status != 'completed'
        )
      ON CONFLICT (admin_id, tenant_id, item_type) DO NOTHING
    `;
    
    await this.db.query(overduePaymentsQuery, [adminId]);
    
    // Check for expiring leases
    const expiringLeasesQuery = `
      INSERT INTO admin_action_items (admin_id, tenant_id, property_id, item_type, priority, title, description, due_date, metadata)
      SELECT 
        p.admin_id,
        t.id,
        p.id,
        'lease_expiring',
        CASE 
          WHEN t.lease_end_date <= CURRENT_DATE + INTERVAL '14 days' THEN 'critical'
          WHEN t.lease_end_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'high'
          ELSE 'medium'
        END,
        'Lease Expiring: ' || t.name,
        'Lease for ' || t.name || ' expires on ' || t.lease_end_date,
        t.lease_end_date - INTERVAL '7 days',
        json_build_object('lease_end_date', t.lease_end_date, 'unit', t.unit)
      FROM tenants t
      JOIN properties p ON t.property_id = p.id
      WHERE p.admin_id = $1 
        AND t.status = 'active'
        AND t.lease_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
        AND NOT EXISTS (
          SELECT 1 FROM admin_action_items aai 
          WHERE aai.tenant_id = t.id 
            AND aai.item_type = 'lease_expiring' 
            AND aai.status != 'completed'
        )
      ON CONFLICT (admin_id, tenant_id, item_type) DO NOTHING
    `;
    
    await this.db.query(expiringLeasesQuery, [adminId]);
  }

  // Track quick actions for analytics
  async trackQuickAction(actionData) {
    const { adminId, actionType, entityType, entityId, executionTime } = actionData;
    
    const query = `
      INSERT INTO admin_quick_actions (admin_id, action_type, entity_type, entity_id, execution_time_ms)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await this.db.query(query, [adminId, actionType, entityType, entityId, executionTime]);
    return result.rows[0];
  }

  // Get performance insights
  async getPerformanceInsights(adminId, options = {}) {
    const { period = '30_days' } = options;
    
    let dateFilter = '';
    switch (period) {
      case '7_days':
        dateFilter = "AND metric_date >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case '30_days':
        dateFilter = "AND metric_date >= CURRENT_DATE - INTERVAL '30 days'";
        break;
      case '90_days':
        dateFilter = "AND metric_date >= CURRENT_DATE - INTERVAL '90 days'";
        break;
      default:
        dateFilter = "AND metric_date >= CURRENT_DATE - INTERVAL '30 days'";
    }
    
    // Get trend data
    const trendsQuery = `
      SELECT 
        metric_date,
        occupancy_rate,
        collection_rate,
        monthly_revenue,
        active_maintenance_requests
      FROM admin_dashboard_metrics 
      WHERE admin_id = $1 ${dateFilter}
      ORDER BY metric_date ASC
    `;
    
    const trendsResult = await this.db.query(trendsQuery, [adminId]);
    
    // Generate insights
    const insights = this.generateInsights(trendsResult.rows);
    
    return {
      trends: trendsResult.rows,
      insights,
      period
    };
  }

  // Helper methods
  getMetricOrderBy(metric) {
    const metricMap = {
      'occupancy_rate': 'pm.occupancy_rate',
      'revenue': 'pm.revenue',
      'collection_rate': 'pm.collection_rate',
      'maintenance_requests': 'pm.maintenance_requests',
      'net_operating_income': 'pm.net_operating_income'
    };
    return metricMap[metric] || 'pm.occupancy_rate';
  }

  calculatePortfolioAverages(properties) {
    if (properties.length === 0) return {};
    
    const totals = properties.reduce((acc, prop) => {
      acc.occupancyRate += prop.occupancy_rate || 0;
      acc.revenue += prop.revenue || 0;
      acc.collectionRate += prop.collection_rate || 0;
      acc.expenses += prop.expenses || 0;
      acc.netOperatingIncome += prop.net_operating_income || 0;
      acc.maintenanceRequests += prop.maintenance_requests || 0;
      return acc;
    }, {
      occupancyRate: 0,
      revenue: 0,
      collectionRate: 0,
      expenses: 0,
      netOperatingIncome: 0,
      maintenanceRequests: 0
    });
    
    const count = properties.length;
    return {
      occupancyRate: (totals.occupancyRate / count).toFixed(2),
      revenue: totals.revenue / count,
      collectionRate: (totals.collectionRate / count).toFixed(2),
      expenses: totals.expenses / count,
      netOperatingIncome: totals.netOperatingIncome / count,
      maintenanceRequests: (totals.maintenanceRequests / count).toFixed(1)
    };
  }

  generateComparisonInsights(properties, portfolioAvg, metric) {
    const insights = [];
    
    if (properties.length === 0) return insights;
    
    const topPerformer = properties[0];
    const worstPerformer = properties[properties.length - 1];
    
    // Top performer insight
    if (topPerformer && portfolioAvg[metric]) {
      const topValue = topPerformer[metric] || 0;
      const avgValue = parseFloat(portfolioAvg[metric]);
      const variance = ((topValue - avgValue) / avgValue * 100).toFixed(1);
      
      insights.push({
        type: 'top_performer',
        property: topPerformer.property_name,
        metric,
        value: topValue,
        variance: parseFloat(variance),
        message: `${topPerformer.property_name} is ${variance}% ${variance > 0 ? 'above' : 'below'} portfolio average for ${metric.replace('_', ' ')}`
      });
    }
    
    // Worst performer insight
    if (worstPerformer && portfolioAvg[metric]) {
      const worstValue = worstPerformer[metric] || 0;
      const avgValue = parseFloat(portfolioAvg[metric]);
      const variance = ((avgValue - worstValue) / avgValue * 100).toFixed(1);
      
      insights.push({
        type: 'needs_attention',
        property: worstPerformer.property_name,
        metric,
        value: worstValue,
        variance: parseFloat(variance),
        message: `${worstPerformer.property_name} is ${variance}% ${variance > 0 ? 'below' : 'above'} portfolio average for ${metric.replace('_', ' ')}`
      });
    }
    
    return insights;
  }

  generateInsights(trendData) {
    const insights = [];
    
    if (trendData.length < 2) return insights;
    
    const latest = trendData[trendData.length - 1];
    const previous = trendData[trendData.length - 2];
    
    // Occupancy trend
    if (latest.occupancy_rate && previous.occupancy_rate) {
      const change = latest.occupancy_rate - previous.occupancy_rate;
      if (Math.abs(change) > 2) {
        insights.push({
          type: 'occupancy_trend',
          direction: change > 0 ? 'improving' : 'declining',
          change: change.toFixed(2),
          message: `Occupancy rate ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(2)}%`
        });
      }
    }
    
    // Collection rate trend
    if (latest.collection_rate && previous.collection_rate) {
      const change = latest.collection_rate - previous.collection_rate;
      if (Math.abs(change) > 3) {
        insights.push({
          type: 'collection_trend',
          direction: change > 0 ? 'improving' : 'declining',
          change: change.toFixed(2),
          message: `Collection rate ${change > 0 ? 'improved' : 'declined'} by ${Math.abs(change).toFixed(2)}%`
        });
      }
    }
    
    return insights;
  }
}

module.exports = new AdminDashboardService();
