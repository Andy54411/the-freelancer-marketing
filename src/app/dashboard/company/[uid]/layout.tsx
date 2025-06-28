// /Users/andystaudinger/Tasko/src/app/dashboard/company/[uid]/layout.tsx
'use client';

import React, { useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import ProtectedRoute from '@/components/ProtectedRoute';
import { SidebarVisibilityProvider } from '@/contexts/SidebarVisibilityContext';
import { useCompanyDashboard } from '@/hooks/useCompanyDashboard'; // Hook zum Abrufen der Unternehmensdaten
import { FiLoader } from 'react-icons/fi'; // Lade-Icon

const isNonEmptyString = (val: unknown): val is string =>
    typeof val === "string" && val.trim() !== "";

export default function CompanyDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const params = useParams();
    const router = useRouter();
    const uid = typeof params.uid === 'string' ? params.uid : '';

    // Verwende den Hook, um Unternehmensdaten und -zustand abzurufen
    const {
        isChecking,
        isAuthorized,
        userData,
        setView, // setView wird für Header-Callbacks benötigt
    } = useCompanyDashboard();

    // Bereite die Unternehmensdaten für die Header-Komponente vor
    const companyDataForHeader = useMemo(() => {
        if (!uid) return null;
        return {
            uid: uid,
            companyName: isNonEmptyString(userData?.step2?.companyName)
                ? userData.step2.companyName
                : isNonEmptyString(userData?.companyName)
                    ? userData.companyName
                    : 'Unbekannte Firma',
            logoUrl: isNonEmptyString(userData?.profilePictureFirebaseUrl) // Priorität für die Firebase Storage URL
                ? userData.profilePictureFirebaseUrl
                : isNonEmptyString(userData?.step3?.profilePictureURL)
                    ? userData.step3.profilePictureURL
                    : isNonEmptyString(userData?.profilePictureURL)
                        ? userData.profilePictureURL
                        : undefined,
        };
    }, [uid, userData]);

    // Callbacks für die Header-Komponente
    const handleSettingsClick = useCallback(() => {
        // Navigiert zur Haupt-Dashboard-Seite und signalisiert über einen Query-Parameter, dass die Einstellungsansicht gezeigt werden soll.
        router.push(`/dashboard/company/${uid}?view=settings`);
    }, [router, uid]);

    const handleDashboardClick = useCallback(() => {
        // Navigiert zur Haupt-Dashboard-Seite (Standardansicht).
        router.push(`/dashboard/company/${uid}`);
    }, [router, uid]);

    // Lade- und Autorisierungszustand auf Layout-Ebene behandeln
    if (isChecking || !isAuthorized) {
        // ProtectedRoute sollte die Weiterleitung übernehmen, aber ein Ladezustand ist hier sinnvoll
        return (
            <div className="flex justify-center items-center min-h-screen">
                <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" />
                {isChecking ? "Lade Dashboard..." : "Zugriff wird überprüft..."}
            </div>
        );
    }

    return (
        <SidebarVisibilityProvider>
            <ProtectedRoute>
                {/* Main layout container. Define --global-header-height here for children to use. */}
                <div className="flex flex-col min-h-screen" style={{ '--global-header-height': '144px' } as React.CSSProperties}>
                    <Header
                        company={companyDataForHeader}
                        onSettingsClick={handleSettingsClick}
                        onDashboardClick={handleDashboardClick}
                    />
                    {children} {/* Hier wird der Inhalt der jeweiligen Seite gerendert */}
                </div>
            </ProtectedRoute>
        </SidebarVisibilityProvider>
    );
}