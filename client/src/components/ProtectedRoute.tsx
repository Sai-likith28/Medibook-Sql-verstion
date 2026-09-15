import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: ('PATIENT' | 'DOCTOR' | 'ADMIN')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[300px]">
                <Spinner />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect based on actual user role
        if (user.role === 'PATIENT') return <Navigate to="/patient/dashboard" replace />;
        if (user.role === 'DOCTOR') return <Navigate to="/doctor/dashboard" replace />;
        if (user.role === 'ADMIN') return <Navigate to="/admin/reports" replace />;
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
