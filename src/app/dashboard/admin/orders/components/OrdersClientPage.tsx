'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface OrderDetailsModalProps {
    order: any;
    isOpen: boolean;
    onClose: () => void;
}

function OrderDetailsModal({ order, isOpen, onClose }: OrderDetailsModalProps) {
    if (!order) return null;

    const formatDate = (dateValue: any) => {
        if (!dateValue) return 'Kein Datum';
        try {
            if (typeof dateValue === 'string') {
                return new Date(dateValue).toLocaleString('de-DE');
            }
            if (dateValue.seconds) {
                return new Date(dateValue.seconds * 1000).toLocaleString('de-DE');
            }
            return new Date(dateValue).toLocaleString('de-DE');
        } catch (error) {
            return 'Invalid Date';
        }
    };

    const formatPrice = (order: any) => {
        // Zuerst nach Cent-Werten suchen und in Euro umrechnen
        const priceInCents = order.jobCalculatedPriceInCents || order.originalJobPriceInCents || order.totalAmountPaidByBuyer;
        if (priceInCents && priceInCents > 0) {
            const euroPrice = priceInCents / 100;
            return `${euroPrice.toFixed(2)} €`;
        }

        // Dann nach Euro-Werten suchen
        const priceInEuro = order.totalPrice || order.price || order.amount;
        if (priceInEuro && priceInEuro > 0) {
            return `${priceInEuro.toFixed(2)} €`;
        }

        return 'Nicht angegeben';
    };

    const formatStatus = (status: string) => {
        const statusMap: { [key: string]: string } = {
            'zahlung_erhalten_clearing': 'Zahlung erhalten - Clearing',
            'pending': 'Ausstehend',
            'cancelled': 'Storniert',
            'completed': 'Abgeschlossen',
            'confirmed': 'Bestätigt',
            'in_progress': 'In Bearbeitung',
            'draft': 'Entwurf'
        };
        return statusMap[status?.toLowerCase()] || status || 'Unbekannt';
    };

    const getStatusBadgeColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'zahlung_erhalten_clearing':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Auftragsdetails - {order.id}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Grundinformationen */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold">Grundinformationen</h3>
                            <div className="space-y-2">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Auftrags-ID:</label>
                                    <p className="text-sm">{order.id}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Status:</label>
                                    <div className="mt-1">
                                        <Badge className={getStatusBadgeColor(order.status)}>
                                            {formatStatus(order.status)}
                                        </Badge>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Erstellt am:</label>
                                    <p className="text-sm">{formatDate(order.createdAt || order.created_at || order.timestamp)}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Preis:</label>
                                    <p className="text-sm">{formatPrice(order)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Kundeninformationen */}
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold">Kundeninformationen</h3>
                            <div className="space-y-2">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Name:</label>
                                    <p className="text-sm">{order.customerName || 'Unbekannt'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">E-Mail:</label>
                                    <p className="text-sm">{order.customerEmail || 'Nicht verfügbar'}</p>
                                </div>
                                {order.customerPhone && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Telefon:</label>
                                        <p className="text-sm">{order.customerPhone}</p>
                                    </div>
                                )}
                                {/* Kunden-ID weniger prominent anzeigen */}
                                {(order.customerUid || order.customerFirebaseUid) && (
                                    <div>
                                        <label className="text-xs font-medium text-gray-400">Kunden-ID:</label>
                                        <p className="text-xs text-gray-400 font-mono">{order.customerUid || order.customerFirebaseUid}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Beschreibung */}
                    {order.description && (
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold">Beschreibung</h3>
                            <div className="bg-gray-50 p-4 rounded-md">
                                <p className="text-sm whitespace-pre-wrap">{order.description}</p>
                            </div>
                        </div>
                    )}

                    {/* Adresse */}
                    {(order.address || order.location) && (
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold">Adresse</h3>
                            <div className="bg-gray-50 p-4 rounded-md">
                                <p className="text-sm">{order.address || order.location}</p>
                            </div>
                        </div>
                    )}

                    {/* Service-Details */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold">Service-Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                {(order.selectedCategory || order.category) && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Kategorie:</label>
                                        <p className="text-sm">{order.selectedCategory || order.category}</p>
                                    </div>
                                )}
                                {(order.selectedSubcategory || order.subcategory || order.service) && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Service:</label>
                                        <p className="text-sm">{order.selectedSubcategory || order.subcategory || order.service}</p>
                                    </div>
                                )}
                                {(order.providerName || order.provider) && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Anbieter:</label>
                                        <p className="text-sm">{order.providerName || order.provider}</p>
                                    </div>
                                )}
                                {order.jobCity && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Ort:</label>
                                        <p className="text-sm">{order.jobCity}</p>
                                    </div>
                                )}
                                {order.jobPostalCode && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">PLZ:</label>
                                        <p className="text-sm">{order.jobPostalCode}</p>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                {order.jobDateFrom && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Von:</label>
                                        <p className="text-sm">{new Date(order.jobDateFrom).toLocaleDateString('de-DE')}</p>
                                    </div>
                                )}
                                {order.jobDateTo && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Bis:</label>
                                        <p className="text-sm">{new Date(order.jobDateTo).toLocaleDateString('de-DE')}</p>
                                    </div>
                                )}
                                {order.jobTimePreference && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Uhrzeit:</label>
                                        <p className="text-sm">{order.jobTimePreference}</p>
                                    </div>
                                )}
                                {order.jobDurationString && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Dauer:</label>
                                        <p className="text-sm">{order.jobDurationString} Stunden</p>
                                    </div>
                                )}
                                {order.jobTotalCalculatedHours && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Gesamtstunden:</label>
                                        <p className="text-sm">{order.jobTotalCalculatedHours} Stunden</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Zahlungsinformationen */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold">Zahlungsinformationen</h3>
                        <div className="bg-gray-50 p-4 rounded-md">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Zahlungsstatus:</label>
                                    <p className="text-sm">{formatStatus(order.status)}</p>
                                </div>
                                {order.paidAt && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Bezahlt am:</label>
                                        <p className="text-sm">{formatDate(order.paidAt)}</p>
                                    </div>
                                )}
                                {order.clearingPeriodEndsAt && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Clearing-Ende:</label>
                                        <p className="text-sm">{formatDate(order.clearingPeriodEndsAt)}</p>
                                    </div>
                                )}
                                {order.paymentIntentId && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Payment Intent:</label>
                                        <p className="text-xs text-gray-400 font-mono">{order.paymentIntentId}</p>
                                    </div>
                                )}
                                {order.sellerCommissionInCents && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Provision:</label>
                                        <p className="text-sm">{(order.sellerCommissionInCents / 100).toFixed(2)} €</p>
                                    </div>
                                )}
                                {order.totalAmountPaidByBuyer && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Vom Kunden bezahlt:</label>
                                        <p className="text-sm">{(order.totalAmountPaidByBuyer / 100).toFixed(2)} €</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Zeitstempel */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold">Zeitstempel</h3>
                        <div className="bg-gray-50 p-4 rounded-md">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Erstellt am:</label>
                                    <p className="text-sm">{formatDate(order.createdAt || order.created_at || order.timestamp)}</p>
                                </div>
                                {order.lastUpdatedAt && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Aktualisiert am:</label>
                                        <p className="text-sm">{formatDate(order.lastUpdatedAt)}</p>
                                    </div>
                                )}
                                {order.buyerApprovedAt && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Käufer bestätigt am:</label>
                                        <p className="text-sm">{formatDate(order.buyerApprovedAt)}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Notizen */}
                    {order.notes && (
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold">Notizen</h3>
                            <div className="bg-gray-50 p-4 rounded-md">
                                <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end mt-6">
                    <Button onClick={onClose} variant="outline">
                        Schließen
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function OrdersClientPage({ orders: initialOrders }: { orders: any[] }) {
    const [orders, setOrders] = useState(initialOrders);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const formatDate = (dateValue: any) => {
        if (!dateValue) return 'Kein Datum';

        try {
            // Wenn es ein String ist (serialisiert), direkt als Date parsen
            if (typeof dateValue === 'string') {
                const date = new Date(dateValue);
                return date.toLocaleDateString('de-DE');
            }

            // Wenn es ein Objekt mit seconds ist (altes Format)
            if (dateValue.seconds) {
                const date = new Date(dateValue.seconds * 1000);
                return date.toLocaleDateString('de-DE');
            }

            // Versuche es direkt als Date zu konvertieren
            const date = new Date(dateValue);
            return date.toLocaleDateString('de-DE');
        } catch (error) {
            console.error('Fehler beim Formatieren des Datums:', error, dateValue);
            return 'Invalid Date';
        }
    };

    const formatStatus = (status: string) => {
        const statusMap: { [key: string]: string } = {
            'zahlung_erhalten_clearing': 'Zahlung erhalten - Clearing',
            'pending': 'Ausstehend',
            'cancelled': 'Storniert',
            'completed': 'Abgeschlossen',
            'confirmed': 'Bestätigt',
            'in_progress': 'In Bearbeitung',
            'draft': 'Entwurf'
        };
        return statusMap[status?.toLowerCase()] || status || 'Unbekannt';
    };

    const formatPrice = (order: any) => {
        // Zuerst nach Cent-Werten suchen und in Euro umrechnen
        const priceInCents = order.jobCalculatedPriceInCents || order.originalJobPriceInCents || order.totalAmountPaidByBuyer;
        if (priceInCents && priceInCents > 0) {
            const euroPrice = priceInCents / 100;
            return `${euroPrice.toFixed(2)} €`;
        }

        // Dann nach Euro-Werten suchen
        const priceInEuro = order.totalPrice || order.price || order.amount;
        if (priceInEuro && priceInEuro > 0) {
            return `${priceInEuro.toFixed(2)} €`;
        }

        return 'Nicht angegeben';
    };

    const handleOrderClick = (order: any) => {
        setSelectedOrder(order);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedOrder(null);
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Alle Aufträge</h1>
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auftrags-ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kunde</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preis</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {orders.map((order) => (
                            <tr
                                key={order.id}
                                onClick={() => handleOrderClick(order)}
                                className="hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.id}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customerName || 'Unbekannt'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatStatus(order.status)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatPrice(order)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(order.createdAt || order.created_at || order.timestamp)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <OrderDetailsModal
                order={selectedOrder}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
            />
        </div>
    );
}
