"use client";

import React, { Suspense } from 'react';
import UserHeader from '@/components/UserHeader'; // Importiere die UserHeader-Komponente
import ProtectedRoute from '@/components/ProtectedRoute';
import { SidebarVisibilityProvider } from '@/contexts/SidebarVisibilityContext'; // Import SidebarVisibilityProvider
import { FiLoader } from 'react-icons/fi'; // Für den Suspense-Fallback
import { useAuth } from '@/contexts/AuthContext';

export default function UserDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { currentUser } = useAuth();

    return (
        <SidebarVisibilityProvider>
            <ProtectedRoute>
                <div className="flex flex-col min-h-screen" style={{ '--global-header-height': '64px' } as React.CSSProperties}> {/* CSS-Variable hinzugefügt */}
                    <UserHeader currentUid={currentUser?.uid ?? ""} /> {/* currentUid wird aus dem Auth-Context geholt */}
                    <main className="flex-1 overflow-y-auto p-4 lg:p-6 pt-[var(--global-header-height)]"> {/* Padding hinzugefügt */}
                        <Suspense fallback={
                            <div className="flex justify-center items-center min-h-screen">
                                <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" /> Lade Benutzeroberfläche...
                            </div>
                        }>
                            {children}
                        </Suspense>
                    </main>
                </div>
            </ProtectedRoute>
        </SidebarVisibilityProvider>
    );
}