'use client';

import { useEffect } from 'react';
import { redirect } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FiLoader } from 'react-icons/fi';

/**
 * Diese Seite dient als zentraler Einstiegspunkt für das Dashboard.
 * Sie verwendet den client-seitigen AuthContext, um den Benutzer basierend auf seiner Rolle
 * zum richtigen Dashboard weiterzuleiten. Dies stellt eine konsistente Logik
 * mit dem Rest der Anwendung sicher und vermeidet Konflikte zwischen Server- und Client-seitiger Authentifizierung.
 */
export default function DashboardRedirectPage() {
    const { user, loading } = useAuth();

    useEffect(() => {
        // Warten, bis der Ladezustand abgeschlossen ist
        if (loading) {
            return;
        }

        if (user) {
            // Leite basierend auf der Rolle des Benutzers weiter
            switch (user.role) {
                case 'master':
                case 'support':
                    redirect('/dashboard/admin');
                    break; // WICHTIG: Verhindert das "Durchfallen" zum nächsten Fall.
                case 'firma':
                    redirect(`/dashboard/company/${user.uid}`);
                    break; // WICHTIG: Verhindert das "Durchfallen" zum nächsten Fall.
                default: // 'kunde' oder undefiniert
                    redirect(`/dashboard/user/${user.uid}`);
                    break;
            }
        }
        // Wenn nicht geladen wird und kein Benutzer da ist, wird der Benutzer
        // vom ProtectedRoute (im übergeordneten Layout) zum Login weitergeleitet.
    }, [user, loading]);

    // Zeige eine Ladeanzeige, während der Auth-Status geprüft wird.
    return (
        <div className="flex justify-center items-center min-h-screen">
            <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" />
            <span>Leite weiter...</span>
        </div>
    );
}