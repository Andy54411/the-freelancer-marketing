// src/app/dashboard/admin/support/page.tsx
'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { FiLoader, FiShield } from 'react-icons/fi';
import AdminSupportChat from './components/AdminSupportChat';

const AdminSupportPage = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <FiLoader className="animate-spin text-4xl text-teal-500" />
            </div>
        );
    }

    if (user?.role !== 'master' && user?.role !== 'support') {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen text-center">
                <FiShield size={48} className="text-red-500 mb-4" />
                <h1 className="text-2xl font-bold">Zugriff verweigert</h1>
                <p className="text-gray-600 mt-2">Sie haben nicht die erforderlichen Berechtigungen, um diese Seite anzuzeigen.</p>
            </div>
        );
    }

    return (
        <ProtectedRoute>
            <AdminSupportChat />
        </ProtectedRoute>
    );
};

export default AdminSupportPage;