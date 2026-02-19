import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    LayoutDashboard, 
    CreditCard, 
    Wrench, 
    LogOut, 
    User,
    Bell,
    Users,
    Shield,
    BarChart3,
    FileText,
    MessageSquare
} from 'lucide-react';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    // Role-based navigation
    const getNavItems = () => {
        switch (user?.role) {
            case 'super_admin':
                return [
                    { path: '/super-admin', icon: LayoutDashboard, label: 'Dashboard' },
                    { path: '/messages', icon: MessageSquare, label: 'Messages' },
                    { path: '/super-admin/users', icon: Users, label: 'Users' },
                    { path: '/super-admin/admins', icon: Shield, label: 'Admins' },
                    { path: '/super-admin/audit', icon: BarChart3, label: 'Audit Logs' },
                ];
            case 'admin':
                return [
                    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
                    { path: '/messages', icon: MessageSquare, label: 'Messages' },
                    { path: '/admin/documents', icon: FileText, label: 'Documents' },
                    { path: '/admin/register-tenant', icon: User, label: 'Register Tenant' },
                    { path: '/admin/register-admin', icon: Shield, label: 'Register Admin' },
                    { path: '/admin/payments', icon: CreditCard, label: 'Payments' },
                ];
            case 'tenant':
            default:
                return [
                    { path: '/tenant', icon: LayoutDashboard, label: 'Dashboard' },
                    { path: '/messages', icon: MessageSquare, label: 'Messages' },
                    { path: '/tenant/documents', icon: FileText, label: 'Documents' },
                    { path: '/tenant/payments', icon: CreditCard, label: 'Payments' },
                    { path: '/tenant/maintenance', icon: Wrench, label: 'Maintenance' },
                ];
        }
    };

    const navItems = getNavItems();

    return (
        <div className="w-64 bg-gray-900/50 backdrop-blur-xl border-r border-white/10 h-screen fixed left-0 top-0 flex flex-col">
            <div className="p-6 border-b border-white/10">
                <h1 className="text-2xl font-bold text-white tracking-tight">PropPOS</h1>
                <p className="text-xs text-gray-400 mt-1">
                    {user?.role === 'super_admin' && 'System Admin'}
                    {user?.role === 'admin' && 'Admin Portal'}
                    {user?.role === 'tenant' && 'Tenant Portal'}
                </p>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                            isActive(item.path)
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                    </Link>
                ))}
            </nav>

            <div className="p-4 border-t border-white/10">
                <div className="flex items-center gap-3 px-4 py-3 mb-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                        {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
                        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors text-sm font-medium"
                >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
