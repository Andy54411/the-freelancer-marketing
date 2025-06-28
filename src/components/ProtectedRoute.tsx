"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { currentUser, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Wir leiten nur weiter, wenn der Ladevorgang abgeschlossen ist UND kein Benutzer angemeldet ist.
        if (!loading && !currentUser) {
            // Erstellen der `redirectTo` URL aus dem aktuellen Pfad und den Suchparametern.
            const redirectTo = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
            console.log(`ProtectedRoute: Nicht authentifiziert. Leite zu /login weiter mit redirectTo=${redirectTo}`);
            router.push(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
        }
    }, [currentUser, loading, router, pathname, searchParams]);

    // Während der Authentifizierungsstatus geprüft wird, eine Ladeanzeige anzeigen.
    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-blue-100 to-teal-200">
                <p className="text-[#14ad9f] font-semibold text-lg">Lade...</p>
            </div>
        );
    }

    // Wenn der Benutzer authentifiziert ist, den Inhalt der Seite anzeigen.
    // Wenn nicht, wird `null` zurückgegeben, während die Weiterleitung im useEffect stattfindet.
    return currentUser ? <>{children}</> : null;
}