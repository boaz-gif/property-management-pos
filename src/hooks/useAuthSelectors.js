import { useContext } from 'react';
import { AuthContext } from '../features/auth/context/AuthContext';
import {
  selectUser,
  selectToken,
  selectLoading,
  selectRefreshInProgress,
  selectIsSuperAdmin,
  selectIsAdmin,
  selectIsTenant,
  selectCanRegisterUsers,
  selectCanRegisterAdmins,
  selectLogin,
  selectLogout,
  selectRegisterAdmin,
  selectRegisterTenant,
  selectChangePassword,
  selectUserId,
  selectUserEmail,
  selectUserName,
  selectUserRole
} from '../context/AuthSelectors';

// Optimized hooks that only subscribe to specific parts of the auth context
export const useAuthUser = () => {
  const authState = useContext(AuthContext);
  return selectUser(authState);
};

export const useAuthToken = () => {
  const authState = useContext(AuthContext);
  return selectToken(authState);
};

export const useAuthLoading = () => {
  const authState = useContext(AuthContext);
  return selectLoading(authState);
};

export const useAuthRefreshInProgress = () => {
  const authState = useContext(AuthContext);
  return selectRefreshInProgress(authState);
};

// Role hooks
export const useIsSuperAdmin = () => {
  const authState = useContext(AuthContext);
  return selectIsSuperAdmin(authState);
};

export const useIsAdmin = () => {
  const authState = useContext(AuthContext);
  return selectIsAdmin(authState);
};

export const useIsTenant = () => {
  const authState = useContext(AuthContext);
  return selectIsTenant(authState);
};

// Permission hooks
export const useCanRegisterUsers = () => {
  const authState = useContext(AuthContext);
  return selectCanRegisterUsers(authState);
};

export const useCanRegisterAdmins = () => {
  const authState = useContext(AuthContext);
  return selectCanRegisterAdmins(authState);
};

// Action hooks
export const useAuthActions = () => {
  const authState = useContext(AuthContext);
  return {
    login: selectLogin(authState),
    logout: selectLogout(authState),
    registerAdmin: selectRegisterAdmin(authState),
    registerTenant: selectRegisterTenant(authState),
    changePassword: selectChangePassword(authState)
  };
};

// Utility hooks
export const useAuthUserId = () => {
  const authState = useContext(AuthContext);
  return selectUserId(authState);
};

export const useAuthUserEmail = () => {
  const authState = useContext(AuthContext);
  return selectUserEmail(authState);
};

export const useAuthUserName = () => {
  const authState = useContext(AuthContext);
  return selectUserName(authState);
};

export const useAuthUserRole = () => {
  const authState = useContext(AuthContext);
  return selectUserRole(authState);
};

// Combined hooks for common use cases
export const useAuthProfile = () => {
  const authState = useContext(AuthContext);
  return {
    user: selectUser(authState),
    userId: selectUserId(authState),
    email: selectUserEmail(authState),
    name: selectUserName(authState),
    role: selectUserRole(authState)
  };
};

export const useAuthPermissions = () => {
  const authState = useContext(AuthContext);
  return {
    isSuperAdmin: selectIsSuperAdmin(authState),
    isAdmin: selectIsAdmin(authState),
    isTenant: selectIsTenant(authState),
    canRegisterUsers: selectCanRegisterUsers(authState),
    canRegisterAdmins: selectCanRegisterAdmins(authState)
  };
};

export const useAuthState = () => {
  const authState = useContext(AuthContext);
  return {
    user: selectUser(authState),
    token: selectToken(authState),
    loading: selectLoading(authState),
    refreshInProgress: selectRefreshInProgress(authState)
  };
};
