'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FiLoader } from 'react-icons/fi';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Log bei jeder Renderung, um den Zustand zu sehen
    console.log(`[ProtectedRoute] Render für Pfad: ${pathname}. Lade-Status: ${loading}, Benutzer: ${user ? user.uid : 'null'}`);

    useEffect(() => {
        console.log(`[ProtectedRoute Effect] Effekt wird ausgeführt. Lade-Status: ${loading}, Benutzer: ${user ? user.uid : 'null'}`);
        // Nichts unternehmen, solange der Authentifizierungsstatus noch geprüft wird.
        if (loading) {
            console.log("[ProtectedRoute Effect] Ladevorgang aktiv. Effekt wird beendet.");
            return;
        }

        // Wenn die Prüfung abgeschlossen ist und kein Benutzer angemeldet ist, zur Login-Seite weiterleiten.
        if (!user) {
            const redirectTo = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
            console.log(`[ProtectedRoute Effect] KEIN BENUTZER. Leite zu /login weiter mit redirectTo=${redirectTo}`);
            router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
        }
    }, [user, loading, router, pathname, searchParams]);

    // Während der Authentifizierungsstatus geprüft wird, eine Ladeanzeige anzeigen, um ein Flackern des Inhalts zu vermeiden.
    if (loading) {
        console.log("[ProtectedRoute Render] Zeige Lade-Spinner an.");
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" />
                <span>Authentifizierung wird geprüft...</span>
            </div>
        );
    }

    // Wenn die Prüfung abgeschlossen ist und ein Benutzer angemeldet ist, den geschützten Inhalt anzeigen.
    if (user) {
        console.log(`[ProtectedRoute Render] Benutzer ${user.uid} ist authentifiziert. Zeige geschützten Inhalt an.`);
        return <>{children}</>;
    }

    // Andernfalls `null` zurückgeben; die Weiterleitung wird durch den `useEffect`-Hook im Hintergrund ausgeführt.
    console.log("[ProtectedRoute Render] Kein Benutzer und nicht am Laden. Gebe null zurück, während auf Weiterleitung gewartet wird.");
    return null;
}