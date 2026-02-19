import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { dashboardWidgetAPI } from '../../services/api';
import GlassCard from '../../components/ui/GlassCard';
import GlassButton from '../../components/ui/GlassButton';
import PageHeader from '../../components/ui/PageHeader';
import PortfolioKPICards from '../../components/admin/PortfolioKPICards';
import ActionItemsList from '../../components/admin/ActionItemsList';
import PropertyComparisonTable from '../../components/admin/PropertyComparisonTable';
import RevenueTrendChart from '../../components/admin/RevenueTrendChart';
import RecentActivityFeed from '../../components/admin/RecentActivityFeed';
import QuickActionsMenu from '../../components/admin/QuickActionsMenu';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [widgets, setWidgets] = useState([]);
    const [draftWidgets, setDraftWidgets] = useState([]);
    const [editMode, setEditMode] = useState(false);
    const [stats, setStats] = useState({
        totalProperties: 0,
        totalUnits: 0,
        occupiedUnits: 0,
        occupancyRate: 0,
        monthlyRevenue: 0,
        collectedRevenue: 0,
        collectionRate: 0,
        activeMaintenance: 0,
        leasesExpiring30: 0,
        urgentActions: 0
    });
    const [actionSummary, setActionSummary] = useState({
        total: 0,
        critical: 0,
        high: 0,
        overdue: 0
    });
    const [actionItems, setActionItems] = useState([]);
    const [propertyComparison, setPropertyComparison] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [revenueTrend, setRevenueTrend] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [overviewResponse, actionItemsResponse, comparisonResponse, activityResponse, insightsResponse, widgetsResponse] = await Promise.all([
                    api.get('/admin/dashboard/overview'),
                    api.get('/admin/dashboard/action-items', { params: { limit: 5, status: 'pending' } }),
                    api.get('/admin/dashboard/properties-comparison'),
                    api.get('/admin/dashboard/recent-activity', { params: { limit: 5 } }),
                    api.get('/admin/dashboard/performance-insights', { params: { period: '30_days' } }),
                    dashboardWidgetAPI.getWidgets()
                ]);

                const overviewData = overviewResponse.data?.data || {};
                const metrics = overviewData.metrics || {};
                const actionItems = overviewData.actionItems || {};

                setStats({
                    totalProperties: metrics.total_properties || 0,
                    totalUnits: metrics.total_units || 0,
                    occupiedUnits: metrics.occupied_units || 0,
                    occupancyRate: metrics.occupancy_rate || 0,
                    monthlyRevenue: metrics.monthly_revenue || 0,
                    collectedRevenue: metrics.collected_revenue || 0,
                    collectionRate: metrics.collection_rate || 0,
                    activeMaintenance: metrics.active_maintenance_requests || 0,
                    leasesExpiring30: metrics.leases_expiring_30_days || 0,
                    urgentActions: actionItems.critical || 0
                });
                setActionSummary({
                    total: actionItems.total || 0,
                    critical: actionItems.critical || 0,
                    high: actionItems.high || 0,
                    overdue: actionItems.overdue || 0
                });
                setActionItems(actionItemsResponse.data?.data || []);
                setPropertyComparison(comparisonResponse.data?.data?.properties || []);
                setRecentActivity(activityResponse.data?.data || []);

                const trends = insightsResponse.data?.data?.trends || [];
                const trendPoints = trends.slice(-6).map((point) => ({
                    label: new Date(point.metric_date).toLocaleDateString('en-US', { month: 'short' }),
                    value: Number(point.monthly_revenue || 0)
                }));
                setRevenueTrend(trendPoints);

                const widgetList = widgetsResponse.data?.data || [];
                setWidgets(widgetList);
                setDraftWidgets(widgetList);
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
                setError('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return <div className="text-white text-center p-8">Loading dashboard...</div>;
    }

    if (error) {
        return <div className="text-red-400 text-center p-8">{error}</div>;
    }

    const handleQuickAction = (action) => {
        const actionRoutes = {
            register_tenant: '/admin/register-tenant',
            record_payment: '/admin/payments',
            create_maintenance: '/admin/maintenance',
            add_property: '/admin/properties',
            generate_report: '/admin/reports'
        };
        const route = actionRoutes[action];
        if (route) {
            navigate(route);
        }
    };

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
        switch (type) {
            case 'kpi_cards':
                return (
                    <PortfolioKPICards metrics={{
                        total_properties: stats.totalProperties,
                        total_units: stats.totalUnits,
                        occupancy_rate: stats.occupancyRate,
                        monthly_revenue: stats.monthlyRevenue,
                        active_maintenance_requests: stats.activeMaintenance,
                        leases_expiring_30_days: stats.leasesExpiring30
                    }} />
                );
            case 'action_items':
                return <ActionItemsList items={actionItems} onViewAll={() => navigate('/admin/action-items')} />;
            case 'quick_actions':
                return <QuickActionsMenu onAction={handleQuickAction} />;
            case 'property_comparison':
                return <PropertyComparisonTable properties={propertyComparison} />;
            case 'revenue_trend':
                return <RevenueTrendChart data={revenueTrend} />;
            case 'recent_activity':
                return <RecentActivityFeed activities={recentActivity} />;
            case 'portfolio_insights':
                return (
                    <GlassCard className="p-6">
                        <h3 className="text-lg font-semibold mb-2">Portfolio Insights</h3>
                        <p className="text-gray-400 mb-4">Summary of operational focus</p>
                        <div className="space-y-2 text-sm">
                            <p>✅ Collection rate: {stats.collectionRate.toFixed(1)}%</p>
                            <p>🏢 Occupied units: {stats.occupiedUnits} of {stats.totalUnits}</p>
                            <p>🛠️ Active maintenance: {stats.activeMaintenance}</p>
                            <p>⚠️ Critical alerts: {actionSummary.critical}</p>
                        </div>
                        <GlassButton
                            className="mt-4"
                            variant="primary"
                            onClick={() => navigate('/admin/reports')}
                        >
                            View Reports
                        </GlassButton>
                    </GlassCard>
                );
            default:
                return null;
        }
    };

    return (
        <div className="text-white p-8 space-y-8">
            <PageHeader 
                title="Admin Dashboard" 
                breadcrumbs={[{ label: 'Admin' }, { label: 'Dashboard' }]}
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
                <GlassCard className="p-6">
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

export default AdminDashboard;
