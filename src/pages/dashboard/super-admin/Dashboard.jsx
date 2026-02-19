import React, { useState, useEffect } from 'react';
import { Users, Building, DollarSign, Shield, TrendingUp } from 'lucide-react';
import api, { dashboardWidgetAPI } from '../../../services/api';
import GlassCard from '../../../components/ui/GlassCard';
import GlassButton from '../../../components/ui/GlassButton';
import PageHeader from '../../../components/ui/PageHeader';

const SuperAdminDashboard = () => {
  const [widgets, setWidgets] = useState([]);
  const [draftWidgets, setDraftWidgets] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    totalProperties: 0,
    totalRevenue: 0,
    totalTenants: 0,
    occupancyRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersResponse, propertiesResponse, tenantsResponse, paymentsResponse, widgetsResponse] = await Promise.all([
          api.get('/auth/users'),
          api.get('/properties'),
          api.get('/tenants'),
          api.get('/payments'),
          dashboardWidgetAPI.getWidgets()
        ]);

        const users = usersResponse.data?.data || [];
        const properties = propertiesResponse.data?.data || [];
        const tenants = tenantsResponse.data?.data || [];
        const payments = paymentsResponse.data?.data || [];

        const totalRevenue = payments.reduce((sum, p) =>
          sum + (parseFloat(p.amount) || 0), 0
        );

        // Calculate occupancy rate using backend-provided stats
        const totalUnits = properties.reduce((sum, p) => sum + (parseInt(p.units) || 0), 0);
        const occupiedUnits = properties.reduce((sum, p) => sum + (parseInt(p.occupied) || 0), 0);
        const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

        setStats({
          totalUsers: users.length,
          totalAdmins: users.filter(u => u.role === 'admin').length,
          totalProperties: properties.length,
          totalRevenue: totalRevenue.toFixed(2),
          totalTenants: tenants.length,
          occupancyRate
        });

        const widgetList = widgetsResponse.data?.data || [];
        setWidgets(widgetList);
        setDraftWidgets(widgetList);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="text-white text-center p-8">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-400 text-center p-8">
        <p>{error}</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      description: 'System users'
    },
    {
      title: 'Total Admins',
      value: stats.totalAdmins,
      icon: Shield,
      color: 'bg-purple-500',
      description: 'Property managers'
    },
    {
      title: 'Total Properties',
      value: stats.totalProperties,
      icon: Building,
      color: 'bg-green-500',
      description: 'Managed properties'
    },
    {
      title: 'Total Tenants',
      value: stats.totalTenants,
      icon: Users,
      color: 'bg-cyan-500',
      description: 'Active tenants'
    },
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue}`,
      icon: DollarSign,
      color: 'bg-yellow-500',
      description: 'All payments'
    },
    {
      title: 'Occupancy Rate',
      value: `${stats.occupancyRate}%`,
      icon: TrendingUp,
      color: 'bg-orange-500',
      description: 'Property occupancy'
    }
  ];

  const moveWidget = (id, direction) => {
    setDraftWidgets(prev => {
      const idx = prev.findIndex(w => w.id === id);
      if (idx === -1) return prev;
      const nextIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;
      const copy = [...prev];
      const tmp = copy[idx];
      copy[idx] = copy[nextIdx];
      copy[nextIdx] = tmp;
      return copy;
    });
  };

  const toggleWidgetVisibility = (id) => {
    setDraftWidgets(prev => prev.map(w => (w.id === id ? { ...w, visible: !w.visible } : w)));
  };

  const saveWidgetLayout = async () => {
    const payload = draftWidgets.map((w, index) => ({
      id: w.id,
      position: index,
      visible: Boolean(w.visible)
    }));
    await dashboardWidgetAPI.updateOrder(payload);
    setWidgets(draftWidgets);
    setEditMode(false);
  };

  const activeWidgets = (editMode ? draftWidgets : widgets).filter(w => w.visible);

  const renderWidget = (type) => {
    if (type === 'stat_cards') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat, index) => (
            <GlassCard key={index} className="hover:bg-white/10 transition-all duration-300 group">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-white/5 ${stat.color} group-hover:scale-110 transition-transform`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-gray-400 text-sm font-medium">{stat.title}</h3>
              <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-2">{stat.description}</p>
            </GlassCard>
          ))}
        </div>
      );
    }

    if (type === 'quick_actions') {
      return (
        <GlassCard p={true}>
          <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassButton variant="primary" className="py-3">Manage Users</GlassButton>
            <GlassButton variant="primary" className="py-3 bg-purple-600 hover:bg-purple-700">Create Admin</GlassButton>
            <GlassButton variant="primary" className="py-3 bg-green-600 hover:bg-green-700">View Properties</GlassButton>
            <GlassButton variant="primary" className="py-3 bg-orange-600 hover:bg-orange-700">System Settings</GlassButton>
          </div>
        </GlassCard>
      );
    }

    if (type === 'system_info') {
      return (
        <GlassCard p={true}>
          <h2 className="text-xl font-bold text-white mb-6">System Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-gray-300">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Environment</p>
              <p className="text-lg font-bold text-blue-400 capitalize">{process.env.NODE_ENV || 'production'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Updated</p>
              <p className="text-lg font-bold text-blue-400">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </GlassCard>
      );
    }

    return null;
  };

    return (
        <div className="space-y-8">
            <PageHeader 
                title="Super Admin Dashboard" 
                breadcrumbs={[{ label: 'System' }, { label: 'Dashboard' }]}
                actions={
                  <GlassButton
                    variant="ghost"
                    onClick={() => {
                      setEditMode(prev => !prev);
                      setDraftWidgets(widgets);
                    }}
                  >
                    {editMode ? 'Cancel' : 'Edit Dashboard'}
                  </GlassButton>
                }
            />

            {editMode && (
              <GlassCard p={true}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Customize Widgets</h3>
                  <GlassButton onClick={saveWidgetLayout} variant="primary">Save</GlassButton>
                </div>
                <div className="space-y-3">
                  {draftWidgets.map((w, index) => (
                    <div key={w.id} className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-lg p-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{w.widget_type}</div>
                        <div className="text-xs text-gray-400">Position {index + 1}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => toggleWidgetVisibility(w.id)} className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-xs text-white">
                          {w.visible ? 'Hide' : 'Show'}
                        </button>
                        <button type="button" onClick={() => moveWidget(w.id, 'up')} className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-xs text-white">
                          Up
                        </button>
                        <button type="button" onClick={() => moveWidget(w.id, 'down')} className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-xs text-white">
                          Down
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            <div className="space-y-6">
              {activeWidgets.length > 0 ? activeWidgets.map((w) => (
                <div key={w.id}>
                  {renderWidget(w.widget_type)}
                </div>
              )) : (
                <div className="text-gray-400">No widgets configured.</div>
              )}
            </div>
    </div>
  );
};

export default SuperAdminDashboard;
