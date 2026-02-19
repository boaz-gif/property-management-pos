
import React, { useState, useEffect } from 'react';
import { DollarSign, Bell, Wrench, ArrowUpRight, Home, FileText } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import api from '../../../services/apiClient';
import GlassCard from '../../../components/ui/GlassCard';
import PageHeader from '../../../components/ui/PageHeader';
import QuickPayCard from '../../payments/components/QuickPayCard';
import GlassButton from '../../../components/ui/GlassButton';

const StatCard = ({ title, value, icon: Icon, trend, color, subValue }) => (
    <GlassCard className="p-6 relative overflow-hidden group">
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
            <Icon className="h-24 w-24" />
        </div>
        <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-white/5 ${color}`}>
                    <Icon className="h-6 w-6 text-white" />
                </div>
                {trend && (
                    <span className="flex items-center text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                        {trend}
                    </span>
                )}
            </div>
            <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
            <p className="text-3xl font-bold text-white mt-1">{value}</p>
            {subValue && <p className="text-sm text-gray-400 mt-1">{subValue}</p>}
        </div>
    </GlassCard>
);

const TenantDashboard = () => {
    const { user } = useAuth();
    const [summary, setSummary] = useState(null);
    const [widgets, setWidgets] = useState([]);
    const [editMode, setEditMode] = useState(false);
    const [draftWidgets, setDraftWidgets] = useState([]);
    const [rentStatus, setRentStatus] = useState(null);
    const [defaultMethod, setDefaultMethod] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;

            try {
                const [summaryRes, widgetsRes, rentStatusRes, methodsRes] = await Promise.all([
                    api.get('/tenant/dashboard'),
                    api.get('/tenant/widgets'),
                    api.get('/tenant/rent-status'),
                    api.get('/tenant/payment-methods')
                ]);

                setSummary(summaryRes.data);
                setWidgets(widgetsRes.data);
                setDraftWidgets(widgetsRes.data);
                setRentStatus(rentStatusRes.data);
                setDefaultMethod(methodsRes.data.find(m => m.is_default) || methodsRes.data[0]);
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
                setError('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    const handlePayNow = async () => {
         // Logic same as PayRent page, or navigate to it
         window.location.href = '/tenant/payments/pay';
    };

    if (loading) {
        return <div className="text-white text-center">Loading dashboard...</div>;
    }

    if (error) {
        return <div className="text-red-400 text-center">{error}</div>;
    }

    // Default widgets order if not customized (simplified for now)
    const renderWidget = (widgetType) => {
        switch(widgetType) {
            case 'rent_status':
                return (
                    <div className="col-span-1 md:col-span-2">
                         <QuickPayCard 
                             balance={rentStatus?.balance || 0}
                             rentAmount={rentStatus?.rent_amount || 0}
                             nextDueDate={rentStatus?.next_due_date}
                             defaultPaymentMethod={defaultMethod}
                             onPayNow={handlePayNow}
                         />
                    </div>
                );
            case 'maintenance_requests':
                 return (
                    <GlassCard className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Maintenance</h3>
                            <span className="text-orange-400 font-bold">{summary?.open_maintenance_count || 0} Open</span>
                        </div>
                        <p className="text-gray-400 text-sm">
                            {summary?.open_maintenance_count > 0 
                             ? 'You have active maintenance requests.' 
                             : 'No active maintenance requests.'}
                        </p>
                    </GlassCard>
                 );
            case 'announcements':
                 return (
                    <GlassCard className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Announcements</h3>
                            {summary?.unread_announcements_count > 0 && (
                                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                    {summary?.unread_announcements_count} New
                                </span>
                            )}
                        </div>
                        <p className="text-gray-400 text-sm">Check community updates.</p>
                    </GlassCard>
                 );
            case 'quick_actions':
                 return (
                    <GlassCard className="p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                            <button onClick={() => window.location.href='/tenant/maintenance'} className="w-full text-left p-3 rounded bg-white/5 hover:bg-white/10 text-white transition-colors flex items-center gap-2">
                                <Wrench className="w-4 h-4" /> Request Maintenance
                            </button>
                            <button onClick={() => window.location.href='/tenant/documents'} className="w-full text-left p-3 rounded bg-white/5 hover:bg-white/10 text-white transition-colors flex items-center gap-2">
                                <FileText className="w-4 h-4" /> View Lease
                            </button>
                        </div>
                    </GlassCard>
                 );
            default:
                return null;
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
        await api.put('/tenant/widgets/order', { widgets: payload });
        setWidgets(draftWidgets);
        setEditMode(false);
    };

    return (
        <div className="space-y-8">
            <PageHeader 
                title={`Welcome Home, ${summary?.tenant_name?.split(' ')[0] || 'Tenant'}`} 
                breadcrumbs={[{ label: 'Tenant' }, { label: 'Dashboard' }]}
                actions={
                    <GlassButton onClick={() => {
                        setEditMode(prev => !prev);
                        setDraftWidgets(widgets);
                    }}>
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Current Balance" 
                    value={`$${parseFloat(summary?.balance || 0).toFixed(2)}`} 
                    icon={DollarSign} 
                    color={parseFloat(summary?.balance) > 0 ? "bg-red-500" : "bg-green-500"} 
                />
                <StatCard 
                    title="Lease Status" 
                    value={summary?.lease_status?.replace('_', ' ').toUpperCase()} 
                    subValue={`${summary?.days_until_lease_end || 0} days remaining`}
                    icon={FileText} 
                    color="bg-blue-500" 
                />
                <StatCard 
                    title="Maintenance" 
                    value={summary?.open_maintenance_count || 0} 
                    icon={Wrench} 
                    color="bg-orange-500" 
                />
                <StatCard 
                    title="Notifications" 
                    value={summary?.unread_notifications_count || 0} 
                    icon={Bell} 
                    color="bg-purple-500" 
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Render widgets based on order */}
                {(editMode ? draftWidgets : widgets).length > 0 ? (editMode ? draftWidgets : widgets).filter(w => w.visible).map(w => (
                    <React.Fragment key={w.id}>
                        {renderWidget(w.widget_type)}
                    </React.Fragment>
                )) : (
                    // Fallback default layout
                    <>
                        <div className="col-span-1 md:col-span-2">
                             <QuickPayCard 
                                 balance={rentStatus?.balance || 0}
                                 rentAmount={rentStatus?.rent_amount || 0}
                                 nextDueDate={rentStatus?.next_due_date}
                                 defaultPaymentMethod={defaultMethod}
                                 onPayNow={handlePayNow}
                             />
                        </div>
                        <GlassCard className="p-6">
                            <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <button onClick={() => window.location.href='/tenant/maintenance'} className="w-full text-left p-3 rounded bg-white/5 hover:bg-white/10 text-white transition-colors flex items-center gap-2">
                                    <Wrench className="w-4 h-4" /> Request Maintenance
                                </button>
                                <button onClick={() => window.location.href='/tenant/documents'} className="w-full text-left p-3 rounded bg-white/5 hover:bg-white/10 text-white transition-colors flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> View Lease
                                </button>
                            </div>
                        </GlassCard>
                    </>
                )}
            </div>
        </div>
    );
};

export default TenantDashboard;
