'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { FiLoader } from 'react-icons/fi';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Diese Logik wird nur ausgeführt, wenn der Ladevorgang abgeschlossen ist.
        if (!loading) {
            if (user) {
                // HILFREICHES LOGGING: Zeigt den aktuellen Benutzer und seine Rolle in der Konsole an.
                console.log(`[AdminLayout] Auth-Prüfung: Benutzer ${user.uid} ist eingeloggt mit Rolle: '${user.role}'`);
                if (user.role !== 'master' && user.role !== 'support') {
                    console.warn(`[AdminLayout] Unbefugter Zugriff. Leite weiter...`);
                    router.replace('/dashboard');
                }
            } else {
                console.log('[AdminLayout] Auth-Prüfung: Kein Benutzer gefunden. Leite zum Login weiter.');
                router.replace('/login');
            }
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
