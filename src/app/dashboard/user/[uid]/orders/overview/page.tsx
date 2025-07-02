'use client';

import React, { useState, useEffect, useMemo, ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FiFilter, FiMoreVertical, FiPackage, FiClock, FiSearch, FiChevronDown, FiInbox, FiLoader, FiFolder } from 'react-icons/fi';
import Link from 'next/link';
import { httpsCallable } from 'firebase/functions';
import { Button } from '@/components/ui/button'; // Importiere die Button-Komponente
import { functions } from '@/firebase/clients'; // Importiere die konfigurierte functions-Instanz
import { useAuth, AuthContextType } from '@/contexts/AuthContext'; // AuthContextType importiert für bessere Typisierung

// Dieses Interface sollte exakt dem Rückgabetyp der `getUserOrders`-Funktion entsprechen.
// Die Backend-Funktion liefert bereits alle benötigten Felder in einem sauberen Format.
interface Order {
    id: string;
    selectedSubcategory: string;
    providerName: string;
    totalAmountPaidByBuyer: number; // Verwende das Feld für den Gesamtpreis
    status: 'AKTIV' | 'ABGESCHLOSSEN' | 'STORNIERT' | 'FEHLENDE DETAILS' | 'IN BEARBEITUNG' | 'zahlung_erhalten_clearing' | 'abgelehnt_vom_anbieter';
    selectedAnbieterId: string;
    currency?: string;
    paidAt?: { _seconds: number, _nanoseconds: number } | string; // Verwende das spezifische Feld
    projectName?: string;
}


type OrderStatusFilter = 'ALLE' | 'AKTIV' | 'ABGESCHLOSSEN' | 'STORNIERT';

const TABS: OrderStatusFilter[] = ['ALLE', 'AKTIV', 'ABGESCHLOSSEN', 'STORNIERT'];

const OrdersOverviewPage = () => {
    const params = useParams();
    const router = useRouter();
    const authContext = useAuth(); // Hole den gesamten AuthContext
    const uidFromParams = params.uid as string; // Geändert von userId zu uid

    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<OrderStatusFilter>('ALLE');

    useEffect(() => {
        // authContext ist durch den useAuth-Hook garantiert nicht null.
        if (authContext.loading) {
            setIsLoading(true);
            return;
        }

        const currentUser = authContext.currentUser;

        if (!currentUser) {
            // Optional: Weiterleitung zum Login, falls kein Benutzer angemeldet ist
            // router.push('/login');
            setIsLoading(false);
            setError("Bitte melden Sie sich an, um Ihre Aufträge anzuzeigen.");
            return;
        }

        // An dieser Stelle ist currentUser garantiert nicht null.
        if (uidFromParams && currentUser.uid !== uidFromParams) { // Geändert von userIdFromParams zu uidFromParams
            // Optional: Sicherheitsüberprüfung, ob der angemeldete Benutzer die Aufträge dieses Dashboards sehen darf
            // router.push('/dashboard'); // Oder eine Fehlerseite
            setIsLoading(false);
            setError("Zugriff verweigert.");
            return;
        }

        // Daten abrufen, da der Benutzer authentifiziert und autorisiert ist.
        const fetchOrders = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Annahme: Du hast eine Cloud Function 'getUserOrders'
                // die { userId: string } als Daten erwartet und { orders: Order[] } zurückgibt.
                const getUserOrdersCallable = httpsCallable<{ userId: string }, { orders: Order[] }>(functions, 'getUserOrders');
                console.log(`[OrdersOverviewPage] Rufe getUserOrders für User ${uidFromParams} auf...`);
                const result = await getUserOrdersCallable({ userId: uidFromParams });

                if (result.data && Array.isArray(result.data.orders)) {
                    // Filtere Aufträge mit dem Status 'abgelehnt_vom_anbieter' heraus,
                    // da diese in der Übersicht nicht angezeigt werden sollen.
                    const visibleOrders = (result.data.orders as Order[]).filter(
                        order => order.status !== 'abgelehnt_vom_anbieter'
                    );
                    setOrders(visibleOrders);
                } else {
                    setOrders([]);
                }

            } catch (err: any) {
                console.error("Fehler beim Laden der Aufträge:", err);
                let detailedMessage = "Ein unbekannter Fehler ist aufgetreten.";
                if (err.code === 'functions/internal') {
                    detailedMessage = "Ein interner Serverfehler ist aufgetreten. Dies deutet oft auf ein Problem mit der Cloud Function oder einen fehlenden Datenbank-Index hin. Bitte überprüfen Sie die Firebase Function-Logs für weitere Details.";
                } else if (err.message) {
                    detailedMessage = err.message;
                }
                setError(`Aufträge konnten nicht geladen werden: ${detailedMessage}`);
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrders();

    }, [authContext, uidFromParams, router]); // Geändert von userIdFromParams zu uidFromParams

    const orderCounts = useMemo(() => {
        const counts: Record<OrderStatusFilter, number> = {
            ALLE: orders.length,
            AKTIV: 0,
            ABGESCHLOSSEN: 0,
            STORNIERT: 0,
        };
        orders.forEach(order => {
            if (order.status === 'AKTIV' || order.status === 'IN BEARBEITUNG' || order.status === 'FEHLENDE DETAILS') {
                counts.AKTIV++;
            } else if (order.status === 'ABGESCHLOSSEN' || order.status === 'STORNIERT') {
                counts[order.status]++;
            }
        });
        return counts;
    }, [orders]);

    const filteredOrders = useMemo(() => {
        if (activeTab === 'ALLE') return orders;
        return orders.filter(order => {
            if (activeTab === 'AKTIV') return order.status === 'AKTIV' || order.status === 'IN BEARBEITUNG' || order.status === 'FEHLENDE DETAILS';
            return order.status === activeTab;
        });
    }, [orders, activeTab]);

    const getStatusColor = (status: Order['status']) => {
        switch (status) {
            case 'ABGESCHLOSSEN': return 'text-green-600 bg-green-100';
            case 'AKTIV':
            case 'IN BEARBEITUNG': return 'text-blue-600 bg-blue-100';
            case 'STORNIERT': return 'text-red-600 bg-red-100';
            case 'FEHLENDE DETAILS': return 'text-yellow-600 bg-yellow-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const formatOrderDate = (date: Order['paidAt']): string => {
        if (typeof date === 'string' && date) {
            return new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        if (date && typeof date === 'object' && '_seconds' in date) {
            return new Date(date._seconds * 1000).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        return 'Unbekanntes Datum';
    };

    const formatPrice = (priceInCents: number, currency: string = 'EUR'): string => {
        const amount = priceInCents / 100;
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: currency }).format(amount);
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><FiLoader className="animate-spin text-3xl text-teal-500" /></div>;
    }

    if (error) {
        return <div className="text-center py-10 text-red-500">{error}</div>;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-semibold text-gray-800 mb-6">Meine Aufträge</h1>

            {/* Tabs */}
            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab
                                    ? 'border-teal-500 text-teal-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            {tab.charAt(0) + tab.slice(1).toLowerCase()}
                            <span className={`ml-2 py-0.5 px-2 rounded-full text-xs font-medium ${activeTab === tab ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-600'}`}>
                                {orderCounts[tab]}
                            </span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Filterleiste (vereinfacht) */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative w-full sm:max-w-xs">
                    <input
                        type="search"
                        placeholder="Aufträge durchsuchen..."
                        className="w-full p-2 pl-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
                <Button variant="outline" className="flex items-center gap-2">
                    <FiFilter size={16} /> Filter
                    <FiChevronDown size={16} />
                </Button>
            </div>

            {/* Auftragsliste */}
            {filteredOrders.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                    <FiInbox size={48} className="mx-auto mb-4 text-gray-400" />
                    Keine Aufträge in dieser Ansicht gefunden.
                </div>
            ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul role="list" className="divide-y divide-gray-200">
                        {filteredOrders.map((order) => (
                            <li key={order.id}>
                                <Link href={`/dashboard/user/${uidFromParams}/orders/${order.id}`} className="block hover:bg-gray-50"> {/* Geändert von userIdFromParams zu uidFromParams */}
                                    <div className="px-4 py-4 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-teal-600 truncate w-2/3">{order.selectedSubcategory}</p>
                                            <div className="ml-2 flex-shrink-0 flex">
                                                <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                                    {order.status}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-2 sm:flex sm:justify-between">
                                            <div className="sm:flex">
                                                <p className="flex items-center text-sm text-gray-500">
                                                    <FiPackage className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                                    {order.providerName}
                                                </p>
                                                {order.projectName && (
                                                    <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                                        <FiFolder className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                                        Projekt: {order.projectName}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                                <FiClock className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                                <p>
                                                    Bestellt am <time dateTime={
                                                        order.paidAt
                                                            ? (typeof order.paidAt === 'string' ? order.paidAt : new Date(order.paidAt._seconds * 1000).toISOString())
                                                            : undefined
                                                    }>{formatOrderDate(order.paidAt)}</time>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-2 sm:flex sm:justify-between">
                                            <p className="text-sm text-gray-900 font-semibold">{formatPrice(order.totalAmountPaidByBuyer, order.currency)}</p>
                                            <div className="relative">
                                                {/* Aktionen-Button (optional) */}
                                                <button
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); alert(`Aktionen für Auftrag ${order.id}`); }}
                                                    className="text-gray-400 hover:text-gray-600"
                                                >
                                                    <FiMoreVertical size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Paginierung (vereinfacht) */}
            {filteredOrders.length > 0 && (
                <div className="mt-6 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                    <div className="flex flex-1 justify-between sm:hidden">
                        <Button variant="outline">Vorherige</Button>
                        <Button variant="outline" className="ml-3">Nächste</Button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Zeige <span className="font-medium">1</span> bis <span className="font-medium">{Math.min(10, filteredOrders.length)}</span> von{' '}
                                <span className="font-medium">{filteredOrders.length}</span> Ergebnissen
                            </p>
                        </div>
                        <div>
                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                <Button variant="outline" className="rounded-r-none">Vorherige</Button>
                                {/* Hier könnten Seitenzahlen generiert werden */}
                                <Button variant="outline" className="rounded-l-none">Nächste</Button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrdersOverviewPage;