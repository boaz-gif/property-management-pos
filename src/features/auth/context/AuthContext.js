import React, { createContext, useState, useEffect, useContext, useCallback, useRef, useMemo } from 'react';
import { authAPI } from '../api/authApi';

const AuthContext = createContext();

/** Normalize API response: backend may return { data: { token, user } } or { token, user } */
const parseAuthPayload = (response) => {
    const payload = response?.data?.data ?? response?.data ?? {};
    return {
        token: payload.token ?? null,
        user: payload.user ?? null
    };
};

/** Decode JWT exp (seconds) to ms, or null on failure */
const getTokenExpiryMs = (jwtToken) => {
    try {
        const payload = JSON.parse(atob(jwtToken.split('.')[1]));
        return payload.exp ? payload.exp * 1000 : null;
    } catch {
        return null;
    }
};

export const useAuth = () => useContext(AuthContext);

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);
    const [refreshInProgress, setRefreshInProgress] = useState(false);

    const tokenRefreshTimerRef = useRef(null);
    const isMountedRef = useRef(true);
    const tokenRef = useRef(token);
    const refreshTokenFnRef = useRef(null);

    tokenRef.current = token;

    // Stable logout: reads token from ref to avoid dependency and re-triggering effects
    const logout = useCallback(async () => {
        const currentToken = tokenRef.current;
        try {
            if (currentToken) {
                try {
                    await authAPI.logout();
                } catch (error) {
                    console.warn('Logout API call failed:', error);
                }
            }
        } finally {
            if (tokenRefreshTimerRef.current) {
                clearTimeout(tokenRefreshTimerRef.current);
                tokenRefreshTimerRef.current = null;
            }
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (isMountedRef.current) {
                setToken(null);
                setUser(null);
            }
        }
    }, []);

    /** Schedule a single refresh before token expiry (uses ref to avoid stale closure) */
    const scheduleTokenRefresh = useCallback((expiryTimeMs) => {
        if (tokenRefreshTimerRef.current) {
            clearTimeout(tokenRefreshTimerRef.current);
            tokenRefreshTimerRef.current = null;
        }
        if (!expiryTimeMs) return;
        const refreshAt = expiryTimeMs - TOKEN_REFRESH_BUFFER_MS - Date.now();
        if (refreshAt > 0) {
            tokenRefreshTimerRef.current = setTimeout(() => {
                tokenRefreshTimerRef.current = null;
                if (refreshTokenFnRef.current) refreshTokenFnRef.current();
            }, refreshAt);
        }
    }, []);

    const refreshToken = useCallback(async () => {
        const currentToken = tokenRef.current;
        if (!currentToken) return;
        setRefreshInProgress(true);
        try {
            const response = await authAPI.refreshToken(currentToken);
            const { token: newToken, user: userData } = parseAuthPayload(response);
            if (!isMountedRef.current) return;
            if (newToken) {
                localStorage.setItem('token', newToken);
                setToken(newToken);
                tokenRef.current = newToken;
                if (userData) {
                    localStorage.setItem('user', JSON.stringify(userData));
                    setUser(userData);
                }
                const expiryMs = getTokenExpiryMs(newToken);
                if (expiryMs) scheduleTokenRefresh(expiryMs);
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
            if (isMountedRef.current) await logout();
        } finally {
            if (isMountedRef.current) setRefreshInProgress(false);
        }
    }, [logout, scheduleTokenRefresh]);

    refreshTokenFnRef.current = refreshToken;

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (tokenRefreshTimerRef.current) {
                clearTimeout(tokenRefreshTimerRef.current);
                tokenRefreshTimerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            try {
                if (token) {
                    try {
                        const response = await authAPI.getProfile();
                        const { user: userData } = parseAuthPayload(response);
                        if (cancelled || !isMountedRef.current) return;
                        if (userData) {
                            localStorage.setItem('user', JSON.stringify(userData));
                            setUser(userData);
                            const expiryMs = getTokenExpiryMs(token);
                            if (expiryMs) scheduleTokenRefresh(expiryMs);
                        } else {
                            await logout();
                        }
                    } catch (error) {
                        console.error('Token validation failed:', error);
                        if (!cancelled && isMountedRef.current) await logout();
                    }
                } else {
                    if (isMountedRef.current) setUser(null);
                }
            } finally {
                if (isMountedRef.current && !cancelled) setLoading(false);
            }
        };
        run();
        return () => { cancelled = true; };
    }, [token, logout, scheduleTokenRefresh]);

    const login = useCallback(async (email, password) => {
        const response = await authAPI.login({ email: email.toLowerCase(), password });
        const { token: newToken, user: userData } = parseAuthPayload(response);
        if (!newToken || !userData) throw new Error('Unexpected login response');
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setToken(newToken);
        setUser(userData);
        return userData;
    }, []);

    const registerAdmin = useCallback(async (userData) => {
        const response = await authAPI.registerAdmin(userData);
        return response.data;
    }, []);

    const registerTenant = useCallback(async (userData) => {
        const response = await authAPI.registerTenant(userData);
        return response.data;
    }, []);

    const register = useCallback(async () => {
        throw new Error('Public registration is no longer available. Please contact your administrator.');
    }, []);

    const updateToken = useCallback((newToken) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        tokenRef.current = newToken;
    }, []);

    const isSuperAdmin = useCallback(() => user?.role === 'super_admin', [user]);
    const isAdmin = useCallback(() => user?.role === 'admin', [user]);
    const isTenant = useCallback(() => user?.role === 'tenant', [user]);
    const canRegisterUsers = useCallback(() => isSuperAdmin() || isAdmin(), [isSuperAdmin, isAdmin]);
    const canRegisterAdmins = useCallback(() => isSuperAdmin(), [isSuperAdmin]);

    const getRoleBasedRedirect = useCallback(() => {
        if (!user) return '/login';
        switch (user.role) {
            case 'super_admin': return '/super-admin';
            case 'admin': return '/admin';
            case 'tenant': return '/tenant';
            default: return '/login';
        }
    }, [user]);

    const getAllUsers = useCallback(async (role = null) => {
        const response = await authAPI.getUsers(role ? { role } : {});
        return response.data.users;
    }, []);

    const getUserById = useCallback(async (userId) => {
        const response = await authAPI.getUserById(userId);
        return response.data.user;
    }, []);

    const updateUser = useCallback(async (userId, userData) => {
        const response = await authAPI.updateUser(userId, userData);
        return response.data.user;
    }, []);

    const deleteUser = useCallback(async (userId) => {
        const response = await authAPI.deleteUser(userId);
        return response.data;
    }, []);

    const changePassword = useCallback(async (currentPassword, newPassword) => {
        const response = await authAPI.changePassword({ currentPassword, newPassword });
        return response.data;
    }, []);

    const logoutAll = useCallback(async () => {
        try {
            await authAPI.logoutAll();
        } catch (error) {
            console.warn('Logout all API call failed:', error);
        } finally {
            await logout();
        }
    }, [logout]);

    const value = useMemo(() => ({
        user,
        token,
        login,
        register,
        registerAdmin,
        registerTenant,
        updateToken,
        logout,
        logoutAll,
        refreshToken,
        refreshInProgress,
        loading,
        isSuperAdmin,
        isAdmin,
        isTenant,
        canRegisterUsers,
        canRegisterAdmins,
        getRoleBasedRedirect,
        getAllUsers,
        getUserById,
        updateUser,
        deleteUser,
        changePassword
    }), [
        user,
        token,
        login,
        register,
        registerAdmin,
        registerTenant,
        updateToken,
        logout,
        logoutAll,
        refreshToken,
        refreshInProgress,
        loading,
        isSuperAdmin,
        isAdmin,
        isTenant,
        canRegisterUsers,
        canRegisterAdmins,
        getRoleBasedRedirect,
        getAllUsers,
        getUserById,
        updateUser,
        deleteUser,
        changePassword
    ]);

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};