// src/app/dashboard/user/[uid]/orders/[orderId]/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/firebase/clients';

// Icons für UI
import { FiLoader, FiAlertCircle, FiMessageSquare, FiArrowLeft, FiUser } from 'react-icons/fi'; // FiUser hinzugefügt

import UserInfoCard from '@/components/UserInfoCard'; // Importiere die neue, generische Komponente
// Die Chat-Komponente
import ChatComponent from '@/components/ChatComponent';

// Interface für ein Auftragsdokument (basierend auf Ihrem Firestore-Screenshot)
interface OrderData {
    id: string;
    serviceTitle: string;
    // Provider-Informationen
    providerId: string;
    providerName: string;
    providerAvatarUrl?: string;
    // Kunden-Informationen
    customerId: string;
    customerName: string;
    customerAvatarUrl?: string;
    orderDate?: { _seconds: number, _nanoseconds: number } | string; // Mapped from paidAt or createdAt
    priceInCents: number; // Mapped from jobCalculatedPriceInCents
    status: string;
    selectedCategory?: string; // Direkt aus Firestore, optional gemacht
    selectedSubcategory?: string; // Direkt aus Firestore, optional gemacht
    jobTotalCalculatedHours?: number; // Direkt aus Firestore (bereits vorhanden)
    beschreibung?: string; // Mapped from description
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
        // Warten, bis der Auth-Status endgültig geklärt ist.
        if (!authReady) {
            return;
        }

        // Wenn nach dem Laden kein Benutzer da ist, zum Login weiterleiten.
        if (!currentUser) {
            console.log("OrderDetailPage: Nicht authentifiziert, leite zu Login weiter.");
            const currentPath = window.location.pathname + window.location.search;
            router.replace(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
            return;
        }

        // Wenn die orderId fehlt, ist das ein Fehler.
        if (!orderId) {
            setError("Auftrags-ID in der URL fehlt.");
            setLoadingOrder(false);
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

                const data = orderDocSnap.data();
                console.log("Raw Firestore data for orderId", orderId, ":", data);
                console.log("Raw selectedCategory:", data.selectedCategory);
                console.log("Raw selectedSubcategory:", data.selectedSubcategory);
                console.log("Raw jobTimePreference:", data.jobTimePreference);


                // Überprüfe die Berechtigung auf der Client-Seite (zusätzlich zur Server-Seite)
                if (currentUser.uid !== data.kundeId && currentUser.uid !== data.selectedAnbieterId) {
                    setError('Keine Berechtigung für diesen Auftrag.');
                    setLoadingOrder(false);
                    return;
                }

                // Funktion zum Abrufen von Teilnehmerdetails (Anbieter oder Kunde)
                const fetchParticipantDetails = async (uid: string, isProvider: boolean) => {
                    if (!uid) return { name: 'Unbekannt', avatarUrl: undefined };

                    // Für Anbieter zuerst in 'companies' nachsehen
                    if (isProvider) {
                        const companyDocRef = doc(db, 'companies', uid);
                        const companyDocSnap = await getDoc(companyDocRef);
                        if (companyDocSnap.exists()) {
                            return {
                                name: companyDocSnap.data().companyName || 'Unbekannter Anbieter',
                                avatarUrl: companyDocSnap.data().logoUrl,
                            };
                        }
                    }

                    // Fallback auf 'users' für Anbieter (falls kein Firmeneintrag) und für Kunden
                    const userDocRef = doc(db, 'users', uid);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        return {
                            name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unbekannter Benutzer',
                            avatarUrl: userData.profilePictureURL,
                        };
                    }

                    return { name: 'Unbekannt', avatarUrl: undefined };
                };

                // Details für beide Teilnehmer parallel abrufen
                const [providerDetails, customerDetails] = await Promise.all([
                    fetchParticipantDetails(data.selectedAnbieterId, true),
                    fetchParticipantDetails(data.kundeId, false)
                ]);

                const orderData: OrderData = {
                    id: orderDocSnap.id,
                    serviceTitle: data.selectedSubcategory || 'Dienstleistung',
                    providerId: data.selectedAnbieterId,
                    providerName: providerDetails.name,
                    providerAvatarUrl: providerDetails.avatarUrl,
                    customerId: data.kundeId,
                    customerName: customerDetails.name,
                    customerAvatarUrl: customerDetails.avatarUrl,
                    orderDate: data.paidAt || data.createdAt,
                    priceInCents: data.jobCalculatedPriceInCents || 0,
                    status: data.status || 'unbekannt',
                    selectedCategory: data.selectedCategory,
                    selectedSubcategory: data.selectedSubcategory,
                    jobTotalCalculatedHours: data.jobTotalCalculatedHours,
                    beschreibung: data.description,
                    jobDateFrom: data.jobDateFrom,
                    jobDateTo: data.jobDateTo,
                    jobTimePreference: data.jobTimePreference,
                };

                console.log("Constructed orderData object:", orderData);
                console.log("Constructed orderData.selectedCategory:", orderData.selectedCategory);
                console.log("Constructed orderData.selectedSubcategory:", orderData.selectedSubcategory);
                console.log("Constructed orderData.jobTimePreference:", orderData.jobTimePreference);
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

    // Bestimmen, welche Benutzerinformationen in der Karte angezeigt werden sollen.
    // Zeigt immer die *andere* Person im Auftrag an.
    const isViewerCustomer = currentUser.uid === order.customerId;
    const cardUser = isViewerCustomer
        ? { id: order.providerId, name: order.providerName, avatarUrl: order.providerAvatarUrl, role: 'Anbieter' as const }
        : { id: order.customerId, name: order.customerName, avatarUrl: order.customerAvatarUrl, role: 'Kunde' as const };

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
                            <p><strong>Status:</strong> <span className={`font-semibold ${order.status === 'bezahlt' || order.status === 'zahlung_erhalten_clearing' ? 'text-green-600' : 'text-yellow-600'}`}>{order.status?.replace(/_/g, ' ').charAt(0).toUpperCase() + order.status?.replace(/_/g, ' ').slice(1)}</span></p>
                            <p><strong>Kategorie:</strong> {order.selectedCategory || 'N/A'} / {order.selectedSubcategory || 'N/A'}</p>
                            <p><strong>Dauer:</strong> {order.jobTotalCalculatedHours || 'N/A'} Stunden</p>
                            <p><strong>Gesamtpreis:</strong> {(order.priceInCents / 100).toFixed(2)} EUR</p>
                            <p><strong>Datum:</strong> {order.jobDateFrom || 'N/A'} {order.jobDateTo && order.jobDateTo !== order.jobDateFrom ? `- ${order.jobDateTo}` : ''}</p>
                            <p><strong>Uhrzeit:</strong> {order.jobTimePreference || 'Nicht angegeben'}</p>
                            <p className="col-span-full"><strong>Beschreibung:</strong> {order.beschreibung || 'Keine Beschreibung vorhanden.'}</p>

                            {/* Container for the FreelancerInfoCard, ensuring it's centered */}
                            <div className="md:col-span-2 mt-4 flex justify-center"> {/* Added flex justify-center */}
                                <UserInfoCard
                                    className="max-w-sm mx-auto" // Apply max-width and auto-margins directly to the card
                                    userId={cardUser.id}
                                    userName={cardUser.name}
                                    userAvatarUrl={cardUser.avatarUrl}
                                    userRole={cardUser.role}
                                />
                            </div>
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