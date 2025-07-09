'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Filter as FiFilter, MoreVertical as FiMoreVertical, Package as FiPackage, Clock as FiClock, Search as FiSearch, ChevronDown as FiChevronDown, Inbox as FiInbox, Loader2 as FiLoader, Folder as FiFolder, User as FiUser } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { httpsCallable } from 'firebase/functions';
import { functions as functionsInstance } from '@/firebase/clients'; // Import the configured instance
import { useAuth } from '@/contexts/AuthContext';

// Vereinfachtes Interface für Auftragsdaten aus Anbietersicht
interface Order {
    id: string;
    selectedSubcategory: string;
    customerName: string; // Name des Kunden
    customerAvatarUrl?: string; // Profilbild des Kunden
    projectName?: string; // Falls vorhanden
    orderedBy: string; // customerFirebaseUid
    orderDate?: { _seconds: number, _nanoseconds: number } | string;
    totalAmountPaidByBuyer: number;
    status: 'AKTIV' | 'ABGESCHLOSSEN' | 'STORNIERT' | 'FEHLENDE DETAILS' | 'IN BEARBEITUNG' | 'BEZAHLT' | 'ZAHLUNG_ERHALTEN_CLEARING' | 'abgelehnt_vom_anbieter';
    uid: string; // Die UID des Anbieters (dieses Unternehmens)
    projectId?: string;
    currency?: string;
}

type OrderStatusFilter = 'ALLE' | 'AKTIV' | 'ABGESCHLOSSEN' | 'STORNIERT';

const CompanyOrdersOverviewPage = () => {
    const params = useParams();
    const router = useRouter();
    const authContext = useAuth();
    const uidFromParams = params.uid as string; // UID des Anbieters (dieses Unternehmens)

    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<OrderStatusFilter>('ALLE');

    useEffect(() => {
        if (authContext.loading) {
            setIsLoading(true);
            return;
        }

        const currentUser = authContext.user;

        if (!currentUser) {
            setError("Bitte melden Sie sich an, um Ihre Aufträge anzuzeigen.");
            setIsLoading(false);
            return;
        }

        // Sicherheitsüberprüfung: Nur der Inhaber des Dashboards darf seine Aufträge sehen
        if (uidFromParams && currentUser.uid !== uidFromParams) {
            setError("Zugriff verweigert. Sie sind nicht berechtigt, diese Aufträge einzusehen.");
            setIsLoading(false);
            return;
        }

        const fetchOrders = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Annahme: Es gibt eine Cloud Function 'getProviderOrders'
                // die { providerId: string } als Daten erwartet und { orders: Order[] } zurückgibt.
                const getProviderOrdersCallable = httpsCallable<{ providerId: string }, { orders: Order[] }>(functionsInstance, 'getProviderOrders');
                console.log(`[CompanyOrdersOverviewPage] Rufe getProviderOrders für Anbieter ${uidFromParams} auf...`);
                const result = await getProviderOrdersCallable({ providerId: uidFromParams });

                if (result.data && Array.isArray(result.data.orders)) {
                    console.log(`[CompanyOrdersOverviewPage] ${result.data.orders.length} Aufträge empfangen.`);
                    // Filtere Aufträge mit dem Status 'abgelehnt_vom_anbieter' heraus, da diese nicht in der Übersicht erscheinen sollen.
                    const visibleOrders = result.data.orders.filter(
                        order => order.status !== 'abgelehnt_vom_anbieter'
                    );
                    setOrders(visibleOrders);
                } else {
                    console.warn("[CompanyOrdersOverviewPage] Keine Aufträge im erwarteten Format vom Backend erhalten.", result.data);
                    setOrders([]);
                }

            } catch (err: any) {
                console.error("Fehler beim Laden der Aufträge:", err);
                const errorMessage = err.message || "Ein unbekannter Fehler ist aufgetreten.";
                setError(`Aufträge konnten nicht geladen werden: ${errorMessage}`);
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrders();

    }, [authContext, uidFromParams, router]);

    const filteredOrders = useMemo(() => {
        if (activeTab === 'ALLE') return orders;
        return orders.filter(order => {
            if (activeTab === 'AKTIV') return order.status === 'AKTIV' || order.status === 'IN BEARBEITUNG' || order.status === 'FEHLENDE DETAILS' || order.status === 'BEZAHLT' || order.status === 'ZAHLUNG_ERHALTEN_CLEARING';
            return order.status === activeTab;
        });
    }, [orders, activeTab]);

    const getStatusColor = (status: Order['status']) => {
        switch (status) {
            case 'ABGESCHLOSSEN': return 'text-green-600 bg-green-100';
            case 'AKTIV':
            case 'IN BEARBEITUNG':
            case 'BEZAHLT':
            case 'ZAHLUNG_ERHALTEN_CLEARING': return 'text-blue-600 bg-blue-100';
            case 'STORNIERT': return 'text-red-600 bg-red-100';
            case 'FEHLENDE DETAILS': return 'text-yellow-600 bg-yellow-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const formatOrderDate = (date: Order['orderDate']): string => {
        if (typeof date === 'string' && date) {
            return new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        if (date && typeof date === 'object' && '_seconds' in date) {
            return new Date(date._seconds * 1000).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        return 'Unbekanntes Datum';
    };

    const formatPrice = (priceInCents: number, currency?: string | null): string => {
        const amount = (priceInCents || 0) / 100; // Add fallback for safety to prevent NaN
        const validCurrency = currency || 'EUR';
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: validCurrency }).format(amount);
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><FiLoader className="animate-spin text-3xl text-teal-500" /></div>;
    }

    if (error) {
        return <div className="text-center py-10 text-red-500">{error}</div>;
    }

    return (
        <div className="container mx-auto px-4 py-8 pt-[var(--global-header-height)]"> {/* Füge Padding für den sticky Header hinzu */}
            <h1 className="text-3xl font-semibold text-gray-800 mb-6">Eingegangene Aufträge</h1>

            {/* Tabs */}
            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {(['ALLE', 'AKTIV', 'ABGESCHLOSSEN', 'STORNIERT'] as OrderStatusFilter[]).map((tab) => (
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
                                {tab === 'ALLE' ? orders.length : orders.filter(o => {
                                    if (tab === 'AKTIV') return o.status === 'AKTIV' || o.status === 'IN BEARBEITUNG' || o.status === 'FEHLENDE DETAILS' || o.status === 'BEZAHLT' || o.status === 'ZAHLUNG_ERHALTEN_CLEARING';
                                    return o.status === tab;
                                }).length}
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
                                <Link href={`/dashboard/company/${uidFromParams}/orders/${order.id}`} className="block hover:bg-gray-50">
                                    <div className="px-4 py-4 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-teal-600 truncate w-2/3">{order.selectedSubcategory}</p>
                                            <div className="ml-2 flex-shrink-0 flex">
                                                <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                                    {order.status.replace(/_/g, ' ').charAt(0).toUpperCase() + order.status.replace(/_/g, ' ').slice(1)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-2 sm:flex sm:justify-between">
                                            <div className="sm:flex">
                                                <p className="flex items-center text-sm text-gray-500">
                                                    <FiUser className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                                    {order.customerName}
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
                                                        order.orderDate
                                                            ? (typeof order.orderDate === 'string' ? order.orderDate : new Date(order.orderDate._seconds * 1000).toISOString())
                                                            : undefined
                                                    }>{formatOrderDate(order.orderDate)}</time>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-2 sm:flex sm:justify-between">
                                            <p className="text-sm text-gray-900 font-semibold">{formatPrice(order.totalAmountPaidByBuyer, order.currency)}</p>
                                            <div className="relative">
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
                                <Button variant="outline" className="rounded-l-none">Nächste</Button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Hilfs-Button-Komponente (könnte auch aus einer UI-Bibliothek kommen)
const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'outline' | 'default', className?: string }> = ({ children, variant = 'default', className = '', ...props }) => {
    const baseStyle = "inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
    const variantStyle = variant === 'outline'
        ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-teal-500"
        : "border-teal-600 bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500";

    return (
        <button className={`${baseStyle} ${variantStyle} ${className}`} {...props}>
            {children}
        </button>
    );
};

export default CompanyOrdersOverviewPage;