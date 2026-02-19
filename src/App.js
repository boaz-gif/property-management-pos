import React, { Suspense, lazy } from 'react';
import PerfProfiler from './components/PerfProfiler';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from './features/auth/context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { UIProvider } from './context/UIContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import GlobalLoadingIndicator from './components/GlobalLoadingIndicator';
import queryClient from './services/query-client';

// Lazy loaded components for code splitting
const Login = lazy(() => import('./features/auth/pages/Login'));
const Unauthorized = lazy(() => import('./features/error/pages/Unauthorized'));
const Forbidden = lazy(() => import('./features/error/pages/Forbidden'));

// Super Admin Components - Lazy Loaded
const SuperAdminDashboard = lazy(() => import('./pages/dashboard/super-admin/Dashboard'));
const UserManagement = lazy(() => import('./pages/dashboard/super-admin/UserManagement'));
const AdminManagement = lazy(() => import('./pages/dashboard/super-admin/AdminManagement'));
const AuditLogs = lazy(() => import('./pages/dashboard/super-admin/AuditLogs'));

// Admin Components - Lazy Loaded
const AdminDashboard = lazy(() => import('./features/dashboard/pages/AdminDashboard'));
const AdminProperties = lazy(() => import('./features/properties/pages/AdminProperties'));
const AdminPropertyDetail = lazy(() => import('./features/properties/pages/AdminPropertyDetail'));
const AdminLeaseManagement = lazy(() => import('./features/leases/pages/AdminLeaseManagement'));
const AdminPayments = lazy(() => import('./features/payments/pages/AdminPayments'));
const RegisterAdmin = lazy(() => import('./features/auth/pages/RegisterAdmin'));
const RegisterTenant = lazy(() => import('./features/auth/pages/RegisterTenant'));

// Tenant Components - Lazy Loaded
const TenantDashboard = lazy(() => import('./features/tenants/pages/TenantDashboard'));
const PayRent = lazy(() => import('./features/payments/pages/PayRent'));
const PaymentHistory = lazy(() => import('./features/payments/pages/PaymentHistory'));
const PaymentMethods = lazy(() => import('./features/payments/pages/PaymentMethods'));
const AutoPaySetup = lazy(() => import('./features/payments/pages/AutoPaySetup'));
const BalanceStatement = lazy(() => import('./features/payments/pages/BalanceStatement'));
const Maintenance = lazy(() => import('./features/maintenance/pages/Maintenance'));
const Documents = lazy(() => import('./features/tenants/pages/Documents'));
const CommunicationHub = lazy(() => import('./features/communications/pages/CommunicationHub'));

// Layout Components - Lazy Loaded
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'));

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalLoadingIndicator />
      <UIProvider>
        <AuthProvider>
          <SocketProvider>
            <NotificationProvider>
              <Router>
                <Suspense fallback={<LoadingSpinner />}>
                  <Routes>
                    {/* ========== PUBLIC ROUTES ========== */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<Navigate to="/login" replace />} />

                    {/* ========== ERROR PAGES ========== */}
                    <Route path="/unauthorized" element={<Unauthorized />} />
                    <Route path="/forbidden" element={<Forbidden />} />

                    {/* ========== SUPER ADMIN ROUTES ========== */}
                    <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
                      <Route element={
                        <PerfProfiler id="super-admin-layout">
                          <DashboardLayout />
                        </PerfProfiler>
                      }>
                        <Route path="/super-admin" element={<SuperAdminDashboard />} />
                        <Route path="/super-admin/users" element={<UserManagement />} />
                        <Route path="/super-admin/admins" element={<AdminManagement />} />
                        <Route path="/super-admin/audit" element={<AuditLogs />} />
                        <Route path="/super-admin/register-admin" element={<RegisterAdmin />} />
                      </Route>
                    </Route>

                    {/* ========== ADMIN ROUTES ========== */}
                    <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin']} />}>
                      <Route element={
                        <PerfProfiler id="admin-layout">
                          <DashboardLayout />
                        </PerfProfiler>
                      }>
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/admin/properties" element={<AdminProperties />} />
                        <Route path="/admin/properties/new" element={<AdminPropertyDetail />} />
                        <Route path="/admin/properties/:propertyId" element={<AdminPropertyDetail />} />
                        <Route path="/admin/leases" element={<AdminLeaseManagement />} />
                        <Route path="/admin/payments" element={<AdminPayments />} />
                        <Route path="/admin/documents" element={<Documents />} />
                        <Route path="/admin/register-admin" element={<RegisterAdmin />} />
                        <Route path="/admin/register-tenant" element={<RegisterTenant />} />
                      </Route>
                    </Route>

                    {/* ========== TENANT ROUTES ========== */}
                    <Route element={<ProtectedRoute allowedRoles={['tenant']} />}>
                      <Route element={
                        <PerfProfiler id="tenant-layout">
                          <DashboardLayout />
                        </PerfProfiler>
                      }>
                        <Route path="/tenant" element={<TenantDashboard />} />
                        <Route path="/tenant/payments" element={<PaymentHistory />} />
                        <Route path="/tenant/payments/pay" element={<PayRent />} />
                        <Route path="/tenant/payment-methods" element={<PaymentMethods />} />
                        <Route path="/tenant/payments/autopay" element={<AutoPaySetup />} />
                        <Route path="/tenant/financials" element={<BalanceStatement />} />
                        <Route path="/tenant/maintenance" element={<Maintenance />} />
                        <Route path="/tenant/documents" element={<Documents />} />
                        {/* Keep old routes for backward compatibility (will redirect) */}
                        <Route path="/dashboard" element={<TenantDashboard />} />
                        <Route path="/dashboard/payments" element={<Navigate to="/tenant/payments/pay" replace />} />
                        <Route path="/dashboard/maintenance" element={<Maintenance />} />
                      </Route>
                    </Route>

                    <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'property_manager', 'tenant', 'maintenance_staff', 'accountant']} />}>
                      <Route element={
                        <PerfProfiler id="shared-layout">
                          <DashboardLayout />
                        </PerfProfiler>
                      }>
                        <Route path="/messages" element={<CommunicationHub />} />
                        <Route path="/messages/:conversationId" element={<CommunicationHub />} />
                      </Route>
                    </Route>

                    {/* ========== CATCH ALL ========== */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                  </Routes>
                </Suspense>
              </Router>
            </NotificationProvider>
          </SocketProvider>
        </AuthProvider>
      </UIProvider>
      {/* React Query DevTools - Only in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

export default App;
