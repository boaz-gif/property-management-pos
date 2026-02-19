import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="flex items-center justify-center h-screen text-white">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/unauthorized" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/forbidden" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
