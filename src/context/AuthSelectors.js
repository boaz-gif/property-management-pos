// Selectors for AuthContext to prevent unnecessary re-renders
export const selectUser = (authState) => authState.user;
export const selectToken = (authState) => authState.token;
export const selectLoading = (authState) => authState.loading;
export const selectRefreshInProgress = (authState) => authState.refreshInProgress;

// Role-based selectors
export const selectIsSuperAdmin = (authState) => authState.user?.role === 'super_admin';
export const selectIsAdmin = (authState) => authState.user?.role === 'admin';
export const selectIsTenant = (authState) => authState.user?.role === 'tenant';

// Permission-based selectors
export const selectCanRegisterUsers = (authState) => 
  authState.user?.role === 'super_admin' || authState.user?.role === 'admin';
export const selectCanRegisterAdmins = (authState) => 
  authState.user?.role === 'super_admin';

// Action selectors (memoized functions)
export const selectLogin = (authState) => authState.login;
export const selectLogout = (authState) => authState.logout;
export const selectRegisterAdmin = (authState) => authState.registerAdmin;
export const selectRegisterTenant = (authState) => authState.registerTenant;
export const selectChangePassword = (authState) => authState.changePassword;

// Utility selectors
export const selectUserId = (authState) => authState.user?.id;
export const selectUserEmail = (authState) => authState.user?.email;
export const selectUserName = (authState) => authState.user?.name;
export const selectUserRole = (authState) => authState.user?.role;
