// /Users/andystaudinger/Tasko/src/components/TimeTrackingOverview.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { FiClock, FiEye, FiCheck, FiX, FiAlertCircle, FiDollarSign } from 'react-icons/fi';
import { CustomerApprovalRequest } from '@/types/timeTracking';
import { TimeTracker } from '@/lib/timeTracker';
import { auth } from '@/firebase/clients';
import { onAuthStateChanged, User } from 'firebase/auth';

interface TimeTrackingOverviewProps {
    customerId: string;
    onRequestsUpdated?: () => void;
}

interface OrderWithTracking {
    orderId: string;
    orderTitle: string;
    providerName: string;
    status: string;
    pendingRequests: CustomerApprovalRequest[];
    totalPendingAmount: number;
    totalPendingHours: number;
}

export default function TimeTrackingOverview({
    customerId,
    onRequestsUpdated,
}: TimeTrackingOverviewProps) {
    const [user, setUser] = useState<User | null>(null);
    const [orders, setOrders] = useState<OrderWithTracking[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<CustomerApprovalRequest | null>(null);
    const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, currentUser => {
            setUser(currentUser);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user && customerId) {
            loadTimeTrackingOverview();
        }
    }, [user, customerId]);

    const loadTimeTrackingOverview = async () => {
        if (!user) return;

        try {
            setLoading(true);

            // Get all pending approval requests for this customer
            const pendingRequests = await TimeTracker.getPendingApprovalRequests(customerId);

            // Group by order
            const orderMap = new Map<string, OrderWithTracking>();

            for (const request of pendingRequests) {
                if (!orderMap.has(request.orderId)) {
                    // Load order details
                    const orderDoc = await TimeTracker.getOrderDetails(request.orderId);
                    orderMap.set(request.orderId, {
                        orderId: request.orderId,
                        orderTitle: orderDoc?.selectedSubcategory || 'Dienstleistung',
                        providerName: orderDoc?.providerName || 'Anbieter',
                        status: orderDoc?.status || 'unknown',
                        pendingRequests: [],
                        totalPendingAmount: 0,
                        totalPendingHours: 0,
                    });
                }

                const order = orderMap.get(request.orderId)!;
                order.pendingRequests.push(request);
                order.totalPendingAmount += request.totalAmount || 0;
                order.totalPendingHours += request.totalHours || 0;
            }

            setOrders(Array.from(orderMap.values()));
        } catch (error) {
            console.error('Error loading time tracking overview:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProcessApproval = async (
        request: CustomerApprovalRequest,
        decision: 'approved' | 'rejected' | 'partially_approved'
    ) => {
        if (!user || !request.id) return;

        try {
            setProcessing(true);

            const approvedEntryIds = decision === 'approved'
                ? request.timeEntries.map(entry => entry.id!)
                : decision === 'partially_approved'
                    ? Array.from(selectedEntries)
                    : [];

            const timeTracker = new TimeTracker();
            await timeTracker.processCustomerApproval(
                request.id,
                customerId,
                decision,
                approvedEntryIds,
                feedback || undefined
            );

            // Reload data
            await loadTimeTrackingOverview();

            // Reset form
            setSelectedRequest(null);
            setSelectedEntries(new Set());
            setFeedback('');

            if (onRequestsUpdated) {
                onRequestsUpdated();
            }
        } catch (error) {
            console.error('Error processing approval:', error);
        } finally {
            setProcessing(false);
        }
    };

    const toggleEntrySelection = (entryId: string) => {
        const newSelection = new Set(selectedEntries);
        if (newSelection.has(entryId)) {
            newSelection.delete(entryId);
        } else {
            newSelection.add(entryId);
        }
        setSelectedEntries(newSelection);
    };

    const formatCurrency = (cents: number): string => {
        return `€${(cents / 100).toFixed(2)}`;
    };

    const formatDuration = (hours: number): string => {
        const fullHours = Math.floor(hours);
        const minutes = Math.round((hours - fullHours) * 60);
        return `${fullHours}:${minutes.toString().padStart(2, '0')}h`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <FiClock className="animate-spin mr-2" />
                <span>Lade Zeiterfassungsübersicht...</span>
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="text-center py-8">
                <FiClock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Keine ausstehenden Stundenfreigaben
                </h3>
                <p className="text-gray-500">
                    Es liegen derzeit keine Zeiterfassungen zur Genehmigung vor.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <FiClock className="mr-2" />
                    Stundenfreigaben Übersicht
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-yellow-50 p-4 rounded-lg">
                        <div className="flex items-center">
                            <FiAlertCircle className="h-6 w-6 text-yellow-600 mr-2" />
                            <div>
                                <p className="text-sm font-medium text-yellow-800">Ausstehende Freigaben</p>
                                <p className="text-2xl font-bold text-yellow-900">
                                    {orders.reduce((sum, order) => sum + order.pendingRequests.length, 0)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center">
                            <FiClock className="h-6 w-6 text-blue-600 mr-2" />
                            <div>
                                <p className="text-sm font-medium text-blue-800">Ausstehende Stunden</p>
                                <p className="text-2xl font-bold text-blue-900">
                                    {formatDuration(orders.reduce((sum, order) => sum + order.totalPendingHours, 0))}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                        <div className="flex items-center">
                            <FiDollarSign className="h-6 w-6 text-green-600 mr-2" />
                            <div>
                                <p className="text-sm font-medium text-green-800">Ausstehender Betrag</p>
                                <p className="text-2xl font-bold text-green-900">
                                    {formatCurrency(orders.reduce((sum, order) => sum + order.totalPendingAmount, 0))}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Orders with pending requests */}
            {orders.map((order) => (
                <div key={order.orderId} className="bg-white shadow rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">{order.orderTitle}</h3>
                            <p className="text-sm text-gray-600">Provider: {order.providerName}</p>
                            <p className="text-sm text-gray-500">Auftrag #{order.orderId}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${order.status === 'AKTIV'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                            {order.status}
                        </span>
                    </div>

                    <div className="space-y-4">
                        {order.pendingRequests.map((request) => (
                            <div key={request.id} className="border rounded-lg p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="font-medium text-gray-900">
                                            Zeiterfassung vom {new Date(request.submittedAt?.toDate()).toLocaleDateString()}
                                        </h4>
                                        <p className="text-sm text-gray-600">
                                            {request.totalHours} Stunden • {formatCurrency(request.totalAmount || 0)}
                                        </p>
                                        {request.providerMessage && (
                                            <p className="text-sm text-gray-700 mt-2 italic">
                                                &quot;{request.providerMessage}&quot;
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setSelectedRequest(selectedRequest === request ? null : request)}
                                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                                    >
                                        <FiEye className="mr-1" />
                                        {selectedRequest === request ? 'Weniger anzeigen' : 'Details anzeigen'}
                                    </button>
                                </div>

                                {selectedRequest === request && (
                                    <div className="mt-4 border-t pt-4">
                                        {/* Time entries details */}
                                        <div className="space-y-2 mb-4">
                                            <h5 className="font-medium text-gray-900">Zeiteinträge:</h5>
                                            {request.timeEntries?.map((entry) => (
                                                <div key={entry.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                    <div className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedEntries.has(entry.id!)}
                                                            onChange={() => toggleEntrySelection(entry.id!)}
                                                            className="mr-3"
                                                        />
                                                        <div>
                                                            <p className="text-sm font-medium">
                                                                {entry.date} • {entry.startTime} - {entry.endTime}
                                                            </p>
                                                            <p className="text-xs text-gray-600">{entry.description}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-medium">{entry.hours}h</p>
                                                        {entry.billableAmount && (
                                                            <p className="text-xs text-gray-600">
                                                                {formatCurrency(entry.billableAmount)}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Feedback */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Feedback (optional):
                                            </label>
                                            <textarea
                                                value={feedback}
                                                onChange={(e) => setFeedback(e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                rows={3}
                                                placeholder="Rückmeldung zu den Zeiteinträgen..."
                                            />
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleProcessApproval(request, 'approved')}
                                                disabled={processing}
                                                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                                            >
                                                <FiCheck className="mr-2" />
                                                Alle genehmigen
                                            </button>

                                            <button
                                                onClick={() => handleProcessApproval(request, 'partially_approved')}
                                                disabled={processing || selectedEntries.size === 0}
                                                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                <FiCheck className="mr-2" />
                                                Auswahl genehmigen ({selectedEntries.size})
                                            </button>

                                            <button
                                                onClick={() => handleProcessApproval(request, 'rejected')}
                                                disabled={processing}
                                                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                                            >
                                                <FiX className="mr-2" />
                                                Ablehnen
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
