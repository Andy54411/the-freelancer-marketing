// src/app/dashboard/user/[uid]/orders/[orderId]/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext'; // Korrekter Pfad zu AuthContext
import { db } from '@/firebase/clients';

// Icons für UI
import { FiLoader, FiAlertCircle, FiMessageSquare, FiArrowLeft } from 'react-icons/fi';

// Die Chat-Komponente
import ChatComponent from '@/components/ChatComponent';

// Interface für ein Auftragsdokument (basierend auf Ihrem Firestore-Screenshot)
interface OrderData {
    jobTotalCalculatedHours: number;
    kundeId: string;
    selectedAnbieterId: string;
    selectedCategory: string;
    selectedSubcategory: string;
    status: string; // z.B. "bezahlt", "abgeschlossen"
    totalPriceInCents: number;
    description: string; // Annahme: Beschreibung ist auch Teil des Auftrags
    jobDateFrom?: string; // Datum
    jobDateTo?: string; // Datum
    jobTimePreference?: string; // Uhrzeit
    // Fügen Sie hier alle relevanten Felder aus Ihrem Auftragsdokument hinzu
}

export default function OrderDetailPage() {
    const router = useRouter();
    const params = useParams();
    const orderId = typeof params.orderId === 'string' ? params.orderId : '';

    const authContext = useAuth();
    const currentUser = authContext?.currentUser || null;
    const authReady = authContext !== null;


    const [order, setOrder] = useState<OrderData | null>(null);
    const [loadingOrder, setLoadingOrder] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Wenn AuthContext noch nicht bereit ist oder kein Benutzer geladen, warten
        if (!authReady || !currentUser || !orderId) {
            if (!authReady) {
                setLoadingOrder(true); // Setze Ladezustand, wenn AuthContext noch nicht bereit
                return;
            }
            if (!currentUser) {
                // FEHLER BEHOBEN: Wenn currentUser null ist, leiten wir direkt zur Login-Seite weiter.
                // Die aktuelle URL wird als redirectTo-Parameter verwendet.
                console.log("OrderDetailPage: Nicht authentifiziert, leite zu Login weiter.");
                const currentPath = window.location.pathname + window.location.search;
                router.replace(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
                return;
            }
            // Wenn orderId fehlt, dann ist es ein Fehler, der hier abgefangen wird
            if (!orderId) {
                setError("Auftrags-ID in der URL fehlt.");
                setLoadingOrder(false);
                return;
            }
            // Wenn wir hier ankommen, sollten authReady, currentUser und orderId vorhanden sein,
            // aber der Code wurde in der vorherigen Zeile aufgrund von 'return' verlassen.
            // Dieser 'return' hier ist nur ein Fallback.
            return;
        }

        const fetchOrder = async () => {
            setLoadingOrder(true);
            setError(null);
            try {
                const orderDocRef = doc(db, 'auftraege', orderId);
                const orderDocSnap = await getDoc(orderDocRef);

                if (!orderDocSnap.exists()) {
                    setError('Auftrag nicht gefunden.');
                    setLoadingOrder(false);
                    return;
                }

                const orderData = orderDocSnap.data() as OrderData;

                if (currentUser.uid !== orderData.kundeId && currentUser.uid !== orderData.selectedAnbieterId) {
                    setError('Keine Berechtigung für diesen Auftrag.');
                    setLoadingOrder(false);
                    return;
                }

                setOrder(orderData);
            } catch (err: any) {
                console.error('Fehler beim Laden des Auftrags:', err);
                setError(`Fehler beim Laden des Auftrags: ${err.message || 'Unbekannter Fehler'}`);
            } finally {
                setLoadingOrder(false);
            }
        };

        fetchOrder();
    }, [authReady, currentUser, orderId, router]);

    const overallLoading = loadingOrder || !authReady; // Gesamt-Ladezustand

    if (overallLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" />
                {authReady && !currentUser ? "Weiterleitung zum Login..." : "Lade Auftragsdetails..."}
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen p-4 text-center">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md" role="alert">
                    <FiAlertCircle size={24} className="inline mr-2" />
                    <strong className="font-bold">Fehler:</strong>
                    <span className="block sm:inline ml-1">{error}</span>
                    <p className="mt-2 text-sm">Bitte überprüfen Sie die URL oder kontaktieren Sie den Support.</p>
                </div>
            </div>
        );
    }

    if (!order || !currentUser) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <FiAlertCircle className="text-4xl text-gray-400 mr-3" />
                Fehler: Auftrag konnte nicht angezeigt werden oder Sie sind nicht angemeldet.
            </div>
        );
    }

    return (
        <Suspense fallback={
            <div className="flex justify-center items-center min-h-screen">
                <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" /> Lade Benutzeroberfläche...
            </div>
        }>
            <main className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    <button onClick={() => router.back()} className="text-[#14ad9f] hover:underline flex items-center gap-2 mb-4">
                        <FiArrowLeft /> Zurück zur Übersicht
                    </button>

                    <h1 className="text-3xl font-semibold text-gray-800 mb-6">Auftrag #{orderId}</h1>

                    {/* Auftragsdetails anzeigen */}
                    <div className="bg-white shadow rounded-lg p-6 mb-8">
                        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Details zum Auftrag</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                            <p><strong>Status:</strong> <span className={`font-semibold ${order.status === 'bezahlt' ? 'text-green-600' : 'text-yellow-600'}`}>{order.status}</span></p>
                            <p><strong>Kategorie:</strong> {order.selectedCategory} / {order.selectedSubcategory}</p>
                            <p><strong>Dauer:</strong> {order.jobTotalCalculatedHours} Stunden</p>
                            <p><strong>Gesamtpreis:</strong> {(order.totalPriceInCents / 100).toFixed(2)} EUR</p>
                            <p><strong>Datum:</strong> {order.jobDateFrom} {order.jobDateTo && order.jobDateTo !== order.jobDateFrom ? `- ${order.jobDateTo}` : ''}</p>
                            <p><strong>Uhrzeit:</strong> {order.jobTimePreference || 'Nicht angegeben'}</p>
                            <p className="col-span-full"><strong>Beschreibung:</strong> {order.description}</p>
                        </div>
                    </div>

                    {/* Chat-Bereich */}
                    <div className="bg-white shadow rounded-lg p-6 h-[600px] flex flex-col">
                        <h2 className="text-2xl font-semibold text-gray-700 mb-4 flex items-center">
                            <FiMessageSquare className="mr-2" /> Chat zum Auftrag
                        </h2>
                        <div className="flex-1 min-h-0">
                            <ChatComponent orderId={orderId} />
                        </div>
                    </div>
                </div>
            </main>
        </Suspense>
    );
}