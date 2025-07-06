'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './support/components/Sidebar';
import Header from './support/components/Header';
import { FiLoader } from 'react-icons/fi';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user) {
            // Nur 'master' und 'support' dürfen auf das Admin-Dashboard zugreifen.
            if (user.role !== 'master' && user.role !== 'support') {
                console.warn(`[AdminLayout] Unbefugter Zugriff von Benutzer ${user.uid} mit Rolle '${user.role}'. Leite weiter...`);
                router.replace('/dashboard'); // Leite zu einem sicheren Standard-Dashboard weiter.
            }
        } else if (!loading && !user) {
            // Wenn nicht eingeloggt, zum Login weiterleiten.
            router.replace('/login');
        }
    }, [user, loading, router]);

    if (loading || !user || (user.role !== 'master' && user.role !== 'support')) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-900">
                <FiLoader className="h-8 w-8 animate-spin text-teal-500" />
            </div>
        );
    }

    return (
        <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
            <Sidebar />
            <div className="flex flex-col">
                <Header />
                <Suspense fallback={<div className="flex-1 flex items-center justify-center"><FiLoader className="h-8 w-8 animate-spin text-teal-500" /></div>}>
                    <main className="flex-1 p-4 sm:p-6">{children}</main>
                </Suspense>
            </div>
        </div>
    );
}
