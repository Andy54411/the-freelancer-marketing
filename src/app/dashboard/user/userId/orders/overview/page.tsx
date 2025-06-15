'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FiFilter, FiMoreVertical, FiPackage, FiClock, FiSearch, FiChevronDown, FiInbox, FiLoader, FiFolder } from 'react-icons/fi'; // FiLoader und FiFolder hinzugefügt
import Image from 'next/image';
import Link from 'next/link';
import { useAuth, AuthContextType } from '@/contexts/AuthContext'; // AuthContextType importiert für bessere Typisierung

// Vereinfachtes Interface für Auftragsdaten
interface Order {
    id: string;
    serviceTitle: string;
    serviceImageUrl?: string;
    freelancerName: string;
    freelancerAvatarUrl?: string;
    projectName?: string;
    orderedBy: string;
    orderDate: string; // Format: "TT. Mon. JJJJ"
    price: string; // Format: "XX,XX €"
    status: 'AKTIV' | 'ABGESCHLOSSEN' | 'STORNIERT' | 'FEHLENDE DETAILS' | 'IN BEARBEITUNG';
    freelancerId: string;
    projectId?: string;
}

// Beispiel-Auftragsdaten (ersetze dies durch echten Datenabruf)
const MOCK_ORDERS: Order[] = [
    {
        id: 'FO526C5DFE2C7',
        serviceTitle: 'Design a minimalist unique eye catching logo for your brand',
        serviceImageUrl: 'https://fiverr-res.cloudinary.com/t_medium7_x2,q_auto,f_auto/gigs/408551609/original/c26f7306612f0c7213383b5d82ccbb99fba45c8b.png',
        freelancerName: 'Andy S.',
        freelancerAvatarUrl: 'https://fiverr-res.cloudinary.com/image/upload/f_auto,q_auto,t_profile_original/v1/attachments/profile/photo/c3c5eddf9c781000819f94e1aff2bc46-1733233350796/940473d2-73a3-40e1-a23d-2a05cd27915b.png',
        projectName: 'Tasko Website',
        orderedBy: 'Steffan Maier',
        orderDate: '17. Jan. 2025',
        price: '8,44 €',
        status: 'ABGESCHLOSSEN',
        freelancerId: 'andy_staudinger',
        projectId: '66a9eedb6daeb55334f0694d'
    },
    {
        id: 'FO825FF19D0C4',
        serviceTitle: 'Create professional and modern logo',
        serviceImageUrl: 'https://fiverr-res.cloudinary.com/t_medium7_x2,q_auto,f_auto/gigs/379015288/original/c819a610e4e89d2524630aa31b17b10f1eed369c.png',
        freelancerName: 'Christian M.',
        freelancerAvatarUrl: 'https://fiverr-res.cloudinary.com/image/upload/f_auto,q_auto,t_profile_original/v1/attachments/profile/photo/c1b4ef96abde5e6d01cfb065b11ea628-1748245832374/e85621c2-f35a-4dec-aedf-571079b35676.png',
        projectName: 'Piro App',
        orderedBy: 'Steffan Maier',
        orderDate: '30. Sep. 2024',
        price: '97,08 €',
        status: 'ABGESCHLOSSEN',
        freelancerId: 'stogmor',
        projectId: '66fa76225aa3a876e862c997'
    },
    // Füge hier bei Bedarf weitere Mock-Aufträge hinzu
];

type OrderStatusFilter = 'ALLE' | 'AKTIV' | 'ABGESCHLOSSEN' | 'STORNIERT';

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
                // Hier würdest du deine echte Datenabruflogik implementieren,
                // z.B. einen API-Aufruf oder eine Firestore-Query
                // Für dieses Beispiel verwenden wir die Mock-Daten nach einer kurzen Verzögerung
                await new Promise(resolve => setTimeout(resolve, 1000));
                setOrders(MOCK_ORDERS);
            } catch (err) {
                console.error("Fehler beim Laden der Aufträge:", err);
                setError("Aufträge konnten nicht geladen werden.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrders();

    }, [authContext, uidFromParams, router]); // Geändert von userIdFromParams zu uidFromParams

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
                                    if (tab === 'AKTIV') return o.status === 'AKTIV' || o.status === 'IN BEARBEITUNG' || o.status === 'FEHLENDE DETAILS';
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
                                <Link href={`/dashboard/user/${uidFromParams}/orders/${order.id}`} className="block hover:bg-gray-50"> {/* Geändert von userIdFromParams zu uidFromParams */}
                                    <div className="px-4 py-4 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-teal-600 truncate w-2/3">{order.serviceTitle}</p>
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
                                                    {order.freelancerName}
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
                                                    Bestellt am <time dateTime={order.orderDate}>{order.orderDate}</time>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-2 sm:flex sm:justify-between">
                                            <p className="text-sm text-gray-900 font-semibold">{order.price}</p>
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

// In einem größeren Projekt wäre es besser, eine zentrale UI-Komponente für Buttons zu verwenden.

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'outline' | 'default', className?: string }> = ({ children, variant = 'default', className = '', ...props }) => {
    const baseStyle = "inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
    const variantStyle = variant === 'outline'
        ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-teal-500"
        : "border-transparent bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500";

    return (
        <button className={`${baseStyle} ${variantStyle} ${className}`} {...props}>
            {children}
        </button>
    );
};

export default OrdersOverviewPage;