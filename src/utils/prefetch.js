/**
 * Utility to prefetch lazy-loaded components
 * @param {Function} componentImport - The lazy component import function (e.g. () => import('./...'))
 */
export const prefetchComponent = (componentImport) => {
    if (typeof componentImport === 'function') {
        // Trigger the dynamic import
        const promise = componentImport();
        
        // Catch errors to prevent console noise if prefetch fails
        if (promise && typeof promise.catch === 'function') {
            promise.catch(() => {
                // Silently fail prefetch - it's not critical
            });
        }
    }
};

/**
 * Pre-defined prefetch map for high-traffic routes
 * This keeps the Sidebar clean and centralizes the logic.
 */
export const PrefetchMap = {
    // Auth
    LOGIN: () => import('../features/auth/pages/Login'),
    
    // Admin
    ADMIN_DASHBOARD: () => import('../features/dashboard/pages/AdminDashboard'),
    ADMIN_PROPERTIES: () => import('../features/properties/pages/AdminProperties'),
    ADMIN_PAYMENTS: () => import('../features/payments/pages/AdminPayments'),
    ADMIN_LEASES: () => import('../features/leases/pages/AdminLeaseManagement'),
    
    // Tenant
    TENANT_DASHBOARD: () => import('../features/tenants/pages/TenantDashboard'),
    TENANT_PAYMENTS: () => import('../features/payments/pages/PayRent'),
    TENANT_MAINTENANCE: () => import('../features/maintenance/pages/Maintenance'),
    TENANT_DOCUMENTS: () => import('../features/tenants/pages/Documents'),
    
    // Shared
    MESSAGES: () => import('../features/communications/pages/CommunicationHub')
};
