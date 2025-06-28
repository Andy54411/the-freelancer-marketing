// src/app/dashboard/company/[uid]/orders/[orderId]/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { db, functions } from '@/firebase/clients';
import { httpsCallable } from 'firebase/functions';

// Icons für UI
import { FiLoader, FiAlertCircle, FiMessageSquare, FiArrowLeft, FiUser, FiAlertTriangle, FiSlash } from 'react-icons/fi';

// Komponenten
import UserInfoCard from '@/components/UserInfoCard';
// Die Chat-Komponente
import ChatComponent from '@/components/ChatComponent';

// Interface für ein Auftragsdokument
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
    orderDate?: { _seconds: number, _nanoseconds: number } | string;
    priceInCents: number;
    status: string;
    selectedCategory?: string;
    selectedSubcategory?: string;
    jobTotalCalculatedHours?: number;
    beschreibung?: string;
    jobDateFrom?: string;
    jobDateTo?: string;
    jobTimePreference?: string;
}

export default function CompanyOrderDetailPage() {
    const router = useRouter();
    const params = useParams();
    const orderId = typeof params.orderId === 'string' ? params.orderId : '';
    const companyUid = typeof params.uid === 'string' ? params.uid : '';

    const { currentUser, loading: authLoading } = useAuth();

    const [order, setOrder] = useState<OrderData | null>(null);
    const [loadingOrder, setLoadingOrder] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    useEffect(() => {
        // Wait until the authentication process is complete.
        if (authLoading) {
            return;
        }

        if (!currentUser) { // If auth is done and there's no user, redirect.
            const currentPath = window.location.pathname + window.location.search;
            router.replace(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
            return;
        }

        if (!orderId || !companyUid) {
            setError("Auftrags- oder Firmen-ID in der URL fehlt.");
            setLoadingOrder(false);
            return;
        }

        // Security check: Ensure the logged-in user is the one whose dashboard is being viewed.
        if (currentUser.uid !== companyUid) {
            setError("Zugriff verweigert. Sie sind nicht berechtigt, diese Seite anzuzeigen.");
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

                const fetchParticipantDetails = async (uid: string, isProvider: boolean) => {
                    if (!uid) return { name: 'Unbekannt', avatarUrl: undefined };

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
    }, [authLoading, currentUser, orderId, router, companyUid]);

    const overallLoading = loadingOrder || authLoading; // Gesamt-Ladezustand

    const handleAcceptOrder = async () => {
        if (!order) return;
        setIsActionLoading(true);
        setActionError(null);
        try {
            const acceptOrderCallable = httpsCallable(functions, 'acceptOrder');
            await acceptOrderCallable({ orderId: order.id });
            setOrder(prev => prev ? { ...prev, status: 'AKTIV' } : null);
        } catch (err: any) {
            console.error("Fehler beim Annehmen des Auftrags:", err);
            setActionError(err.message || 'Fehler beim Annehmen des Auftrags.');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleRejectOrder = async () => {
        if (!order) return;
        const reason = window.prompt("Bitte geben Sie einen Grund für die Ablehnung an (wird dem Kunden mitgeteilt):");
        if (!reason || reason.trim() === '') {
            return; // User cancelled or entered no reason
        }
        setIsActionLoading(true);
        setActionError(null);
        try {
            const rejectOrderCallable = httpsCallable(functions, 'rejectOrder');
            await rejectOrderCallable({ orderId: order.id, reason: reason.trim() });
            setOrder(prev => prev ? { ...prev, status: 'abgelehnt_vom_anbieter' } : null);
        } catch (err: any) {
            console.error("Fehler beim Ablehnen des Auftrags:", err);
            let message = err.message || 'Fehler beim Ablehnen des Auftrags.';
            if (err.details) {
                message += ` Details: ${JSON.stringify(err.details)}`;
            }
            setActionError(message);
        } finally {
            setIsActionLoading(false);
        }
    };

    if (overallLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" />
                {authLoading ? "Authentifizierung wird geprüft..." : "Lade Auftragsdetails..."}
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

    const isViewerProvider = currentUser.uid === order.providerId;
    const cardUser = isViewerProvider
        ? { id: order.customerId, name: order.customerName, avatarUrl: order.customerAvatarUrl, role: 'Kunde' as const }
        : { id: order.providerId, name: order.providerName, avatarUrl: order.providerAvatarUrl, role: 'Anbieter' as const };

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

                            <div className="md:col-span-2 mt-4 flex justify-center">
                                <UserInfoCard
                                    className="max-w-sm mx-auto"
                                    userId={cardUser.id}
                                    userName={cardUser.name}
                                    userAvatarUrl={cardUser.avatarUrl}
                                    userRole={cardUser.role}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Aktions-Box für den Anbieter */}
                    {order.status === 'zahlung_erhalten_clearing' && isViewerProvider && (
                        <div className="bg-white shadow rounded-lg p-6">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <FiAlertTriangle className="h-6 w-6 text-[#14ad9f]" aria-hidden="true" />
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-lg font-semibold text-gray-900">Aktion erforderlich</h3>
                                    <p className="mt-1 text-sm text-gray-600">Dieser Auftrag wurde vom Kunden bezahlt. Bitte nehmen Sie den Auftrag an, um zu beginnen, oder lehnen Sie ihn ab, falls Sie ihn nicht ausführen können. Bei Ablehnung wird dem Kunden der Betrag vollständig zurückerstattet.</p>
                                </div>
                            </div>
                            <div className="mt-4 flex gap-4">
                                <button onClick={handleAcceptOrder} disabled={isActionLoading} className="inline-flex items-center justify-center rounded-md border border-transparent bg-[#14ad9f] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#129a8f] focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isActionLoading ? 'Wird angenommen...' : 'Auftrag annehmen'}
                                </button>
                                <button onClick={handleRejectOrder} disabled={isActionLoading} className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isActionLoading ? '...' : 'Auftrag ablehnen'}
                                </button>
                            </div>
                            {actionError && <p className="text-red-600 mt-2 text-sm">{actionError}</p>}
                        </div>
                    )}


                    <div className="bg-white shadow rounded-lg p-6 h-[600px] flex flex-col">
                        <h2 className="text-2xl font-semibold text-gray-700 mb-4 flex items-center">
                            <FiMessageSquare className="mr-2" /> Chat zum Auftrag
                        </h2>
                        {order.status === 'abgelehnt_vom_anbieter' || order.status === 'STORNIERT' ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center bg-gray-50 rounded-lg p-4">
                                <FiSlash className="text-4xl text-gray-400 mb-3" />
                                <h3 className="text-lg font-semibold text-gray-700">Chat deaktiviert</h3>
                                <p className="text-gray-500 text-sm">Für abgelehnte oder stornierte Aufträge ist der Chat nicht verfügbar.</p>
                            </div>
                        ) : (
                            <div className="flex-1 min-h-0">
                                <ChatComponent orderId={orderId} />
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </Suspense>
    );
}