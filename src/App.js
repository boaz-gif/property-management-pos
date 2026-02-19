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
              <Routes>
                {/* ========== PUBLIC ROUTES ========== */}
                <Route path="/login" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <Login />
                  </Suspense>
                } />
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* ========== ERROR PAGES ========== */}
                <Route path="/unauthorized" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <Unauthorized />
                  </Suspense>
                } />
                <Route path="/forbidden" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <Forbidden />
                  </Suspense>
                } />

                {/* ========== SUPER ADMIN ROUTES ========== */}
                <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
                  <Route element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <PerfProfiler id="super-admin-layout">
                        <DashboardLayout />
                      </PerfProfiler>
                    </Suspense>
                  }>
                    <Route path="/super-admin" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <SuperAdminDashboard />
                      </Suspense>
                    } />
                    <Route path="/super-admin/users" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <UserManagement />
                      </Suspense>
                    } />
                    <Route path="/super-admin/admins" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <AdminManagement />
                      </Suspense>
                    } />
                    <Route path="/super-admin/audit" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <AuditLogs />
                      </Suspense>
                    } />
                    <Route path="/super-admin/register-admin" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <RegisterAdmin />
                      </Suspense>
                    } />
                  </Route>
                </Route>

                {/* ========== ADMIN ROUTES ========== */}
                <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin']} />}>
                  <Route element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <PerfProfiler id="admin-layout">
                        <DashboardLayout />
                      </PerfProfiler>
                    </Suspense>
                  }>
                    <Route path="/admin" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <AdminDashboard />
                      </Suspense>
                    } />
                    <Route path="/admin/properties" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <AdminProperties />
                      </Suspense>
                    } />
                    <Route path="/admin/properties/new" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <AdminPropertyDetail />
                      </Suspense>
                    } />
                    <Route path="/admin/properties/:propertyId" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <AdminPropertyDetail />
                      </Suspense>
                    } />
                    <Route path="/admin/leases" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <AdminLeaseManagement />
                      </Suspense>
                    } />
                    <Route path="/admin/payments" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <AdminPayments />
                      </Suspense>
                    } />
                    <Route path="/admin/documents" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <Documents />
                      </Suspense>
                    } />
                    <Route path="/admin/register-admin" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <RegisterAdmin />
                      </Suspense>
                    } />
                    <Route path="/admin/register-tenant" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <RegisterTenant />
                      </Suspense>
                    } />
                  </Route>
                </Route>

                {/* ========== TENANT ROUTES ========== */}
                <Route element={<ProtectedRoute allowedRoles={['tenant']} />}>
                  <Route element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <PerfProfiler id="tenant-layout">
                        <DashboardLayout />
                      </PerfProfiler>
                    </Suspense>
                  }>
                    <Route path="/tenant" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <TenantDashboard />
                      </Suspense>
                    } />
                    <Route path="/tenant/payments" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <PaymentHistory />
                      </Suspense>
                    } />
                    <Route path="/tenant/payments/pay" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <PayRent />
                      </Suspense>
                    } />
                    <Route path="/tenant/payment-methods" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <PaymentMethods />
                      </Suspense>
                    } />
                    <Route path="/tenant/payments/autopay" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <AutoPaySetup />
                      </Suspense>
                    } />
                    <Route path="/tenant/financials" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <BalanceStatement />
                      </Suspense>
                    } />
                    <Route path="/tenant/maintenance" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <Maintenance />
                      </Suspense>
                    } />
                    <Route path="/tenant/documents" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <Documents />
                      </Suspense>
                    } />
                    {/* Keep old routes for backward compatibility (will redirect) */}
                    <Route path="/dashboard" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <TenantDashboard />
                      </Suspense>
                    } />
                    <Route path="/dashboard/payments" element={
                      <Navigate to="/tenant/payments/pay" replace />
                    } />
                    <Route path="/dashboard/maintenance" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <Maintenance />
                      </Suspense>
                    } />
                  </Route>
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'property_manager', 'tenant', 'maintenance_staff', 'accountant']} />}>
                  <Route element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <PerfProfiler id="shared-layout">
                        <DashboardLayout />
                      </PerfProfiler>
                    </Suspense>
                  }>
                    <Route path="/messages" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <CommunicationHub />
                      </Suspense>
                    } />
                    <Route path="/messages/:conversationId" element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <CommunicationHub />
                      </Suspense>
                    } />
                  </Route>
                </Route>

                {/* ========== CATCH ALL ========== */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
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
