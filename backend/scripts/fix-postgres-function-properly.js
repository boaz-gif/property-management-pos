const { Pool } = require('pg');

// Create a direct connection to fix the function
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'propertydb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 1,
  min: 0,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function fixPostgresFunction() {
  let client;
  try {
    console.log('Connecting to database to fix PostgreSQL function...');
    client = await pool.connect();
    console.log('✅ Connected to database');
    
    // Drop the existing function
    console.log('Dropping existing function...');
    await client.query('DROP FUNCTION IF EXISTS calculate_admin_dashboard_metrics(p_admin_id INTEGER, p_date DATE)');
    console.log('✅ Existing function dropped');
    
    // Create the fixed function with proper DATE_PART syntax
    console.log('Creating fixed function...');
    const createFunctionQuery = `
      CREATE OR REPLACE FUNCTION calculate_admin_dashboard_metrics(p_admin_id INTEGER, p_date DATE DEFAULT CURRENT_DATE)
      RETURNS VOID AS $$
      DECLARE
          v_total_properties INTEGER;
          v_total_units INTEGER;
          v_occupied_units INTEGER;
          v_vacant_units INTEGER;
          v_occupancy_rate DECIMAL(5,2);
          v_monthly_revenue DECIMAL(12,2);
          v_collected_revenue DECIMAL(12,2);
          v_pending_revenue DECIMAL(12,2);
          v_collection_rate DECIMAL(5,2);
          v_total_expenses DECIMAL(12,2);
          v_net_income DECIMAL(12,2);
          v_active_maintenance INTEGER;
          v_overdue_maintenance INTEGER;
          v_avg_resolution_hours DECIMAL(8,2);
          v_total_tenants INTEGER;
          v_new_tenants_month INTEGER;
          v_churned_tenants_month INTEGER;
          v_leases_expiring_30 INTEGER;
          v_leases_expiring_60 INTEGER;
          v_late_payments INTEGER;
          v_urgent_maintenance INTEGER;
      BEGIN
          -- Get portfolio metrics
          SELECT 
              COUNT(p.id),
              COALESCE(SUM(p.units), 0),
              COALESCE(COUNT(t.id) FILTER (WHERE t.status = 'active'), 0),
              COALESCE(COUNT(t.id) FILTER (WHERE t.status != 'active'), 0)
          INTO v_total_properties, v_total_units, v_occupied_units, v_vacant_units
          FROM properties p
          LEFT JOIN tenants t ON p.id = t.property_id AND t.deleted_at IS NULL
          WHERE p.admin_id = p_admin_id AND p.deleted_at IS NULL;
          
          -- Calculate occupancy rate
          v_occupancy_rate := CASE 
              WHEN v_total_units > 0 THEN ROUND((v_occupied_units::DECIMAL / v_total_units) * 100, 2)
              ELSE 0 
          END;
          
          -- Calculate financial metrics
          SELECT 
              COALESCE(SUM(t.rent), 0),
              COALESCE(SUM(pm.amount) FILTER (WHERE pm.status = 'completed'), 0),
              COALESCE(SUM(pm.amount) FILTER (WHERE pm.status = 'pending'), 0)
          INTO v_monthly_revenue, v_collected_revenue, v_pending_revenue
          FROM properties p
          LEFT JOIN tenants t ON p.id = t.property_id AND t.deleted_at IS NULL AND t.status = 'active'
          LEFT JOIN payments pm ON t.id = pm.tenant_id AND pm.deleted_at IS NULL
          WHERE p.admin_id = p_admin_id AND p.deleted_at IS NULL;
          
          -- Calculate collection rate
          v_collection_rate := CASE 
              WHEN v_monthly_revenue > 0 THEN ROUND((v_collected_revenue / v_monthly_revenue) * 100, 2)
              ELSE 0 
          END;
          
          -- Get maintenance metrics with fixed DATE_PART function
          SELECT 
              COUNT(m.id) FILTER (WHERE m.status = 'open' OR m.status = 'in-progress'),
              COUNT(m.id) FILTER (WHERE m.status = 'open' AND m.priority = 'high' AND m.date < CURRENT_DATE - INTERVAL '7 days'),
              COALESCE(AVG(
                  CASE 
                      WHEN m.completed_date IS NOT NULL 
                      THEN (DATE_PART('epoch', m.completed_date) - DATE_PART('epoch', m.date)) / 3600
                      ELSE NULL 
                  END
              ), 0)
          INTO v_active_maintenance, v_overdue_maintenance, v_avg_resolution_hours
          FROM properties p
          LEFT JOIN maintenance m ON p.id = m.property_id AND m.deleted_at IS NULL
          WHERE p.admin_id = p_admin_id AND p.deleted_at IS NULL;
          
          -- Get tenant metrics
          SELECT 
              COUNT(t.id),
              COUNT(t.id) FILTER (WHERE t.created_at >= DATE_TRUNC('month', p_date)),
              COUNT(t.id) FILTER (WHERE t.status = 'inactive' AND t.updated_at >= DATE_TRUNC('month', p_date)),
              COUNT(t.id) FILTER (WHERE t.lease_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'),
              COUNT(t.id) FILTER (WHERE t.lease_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days')
          INTO v_total_tenants, v_new_tenants_month, v_churned_tenants_month, v_leases_expiring_30, v_leases_expiring_60
          FROM properties p
          LEFT JOIN tenants t ON p.id = t.property_id AND t.deleted_at IS NULL
          WHERE p.admin_id = p_admin_id AND p.deleted_at IS NULL;
          
          -- Get alert metrics
          SELECT 
              COUNT(pm.id) FILTER (WHERE pm.status = 'pending' AND pm.date < CURRENT_DATE - INTERVAL '5 days'),
              COUNT(m.id) FILTER (WHERE m.priority = 'high' AND m.status = 'open')
          INTO v_late_payments, v_urgent_maintenance
          FROM properties p
          LEFT JOIN tenants t ON p.id = t.property_id AND t.deleted_at IS NULL
          LEFT JOIN payments pm ON t.id = pm.tenant_id AND pm.deleted_at IS NULL
          LEFT JOIN maintenance m ON p.id = m.property_id AND m.deleted_at IS NULL
          WHERE p.admin_id = p_admin_id AND p.deleted_at IS NULL;
          
          -- Calculate net income (simplified)
          v_net_income := v_collected_revenue - v_total_expenses;
          
          -- Insert or update metrics
          INSERT INTO admin_dashboard_metrics (
              admin_id, metric_date, total_properties, total_units, occupied_units, vacant_units,
              occupancy_rate, monthly_revenue, collected_revenue, pending_revenue, collection_rate,
              total_expenses, net_income, active_maintenance_requests, overdue_maintenance_requests,
              avg_maintenance_resolution_hours, total_tenants, new_tenants_this_month,
              churned_tenants_this_month, leases_expiring_30_days, leases_expiring_60_days,
              late_payments_count, urgent_maintenance_count
          ) VALUES (
              p_admin_id, p_date, v_total_properties, v_total_units, v_occupied_units, v_vacant_units,
              v_occupancy_rate, v_monthly_revenue, v_collected_revenue, v_pending_revenue, v_collection_rate,
              v_total_expenses, v_net_income, v_active_maintenance, v_overdue_maintenance,
              v_avg_resolution_hours, v_total_tenants, v_new_tenants_month,
              v_churned_tenants_month, v_leases_expiring_30, v_leases_expiring_60,
              v_late_payments, v_urgent_maintenance
          )
          ON CONFLICT (admin_id, metric_date) 
          DO UPDATE SET
              total_properties = EXCLUDED.total_properties,
              total_units = EXCLUDED.total_units,
              occupied_units = EXCLUDED.occupied_units,
              vacant_units = EXCLUDED.vacant_units,
              occupancy_rate = EXCLUDED.occupancy_rate,
              monthly_revenue = EXCLUDED.monthly_revenue,
              collected_revenue = EXCLUDED.collected_revenue,
              pending_revenue = EXCLUDED.pending_revenue,
              collection_rate = EXCLUDED.collection_rate,
              total_expenses = EXCLUDED.total_expenses,
              net_income = EXCLUDED.net_income,
              active_maintenance_requests = EXCLUDED.active_maintenance_requests,
              overdue_maintenance_requests = EXCLUDED.overdue_maintenance_requests,
              avg_maintenance_resolution_hours = EXCLUDED.avg_maintenance_resolution_hours,
              total_tenants = EXCLUDED.total_tenants,
              new_tenants_this_month = EXCLUDED.new_tenants_this_month,
              churned_tenants_this_month = EXCLUDED.churned_tenants_this_month,
              leases_expiring_30_days = EXCLUDED.leases_expiring_30_days,
              leases_expiring_60_days = EXCLUDED.leases_expiring_60_days,
              late_payments_count = EXCLUDED.late_payments_count,
              urgent_maintenance_count = EXCLUDED.urgent_maintenance_count;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    await client.query(createFunctionQuery);
    console.log('✅ PostgreSQL function created successfully!');
    
    // Test the function
    console.log('Testing the function...');
    await client.query('SELECT calculate_admin_dashboard_metrics(1, CURRENT_DATE)');
    console.log('✅ Function test passed!');
    
  } catch (error) {
    console.error('❌ Error fixing PostgreSQL function:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
      console.log('🔌 Database connection released');
    }
    await pool.end();
    console.log('🔌 Connection pool closed');
  }
}

// Run the fix
fixPostgresFunction()
  .then(() => {
    console.log('🎉 PostgreSQL function fix completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 PostgreSQL function fix failed:', error);
    process.exit(1);
  });
