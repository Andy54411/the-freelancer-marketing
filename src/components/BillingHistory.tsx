// /Users/andystaudinger/Tasko/src/components/BillingHistory.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { FiClock, FiDollarSign, FiCheck, FiX, FiEye, FiCalendar } from 'react-icons/fi';
import { TimeEntry, CustomerApprovalRequest } from '@/types/timeTracking';
import { auth, db } from '@/firebase/clients';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface BillingHistoryProps {
  orderId?: string; // Optional: Filter by specific order
  customerId?: string; // Optional: Filter by customer
  providerId?: string; // Optional: Filter by provider
}

interface BillingEntry {
  id: string;
  orderId: string;
  orderTitle: string;
  providerName: string;
  customerName: string;
  timeEntry: TimeEntry;
  approvalRequest: CustomerApprovalRequest;
  billedAmount: number;
  billedAt: Date;
  status: 'billed' | 'paid' | 'disputed';
  hourlyRate: number;
}

export default function BillingHistory({ orderId, customerId, providerId }: BillingHistoryProps) {
  const [user, setUser] = useState<User | null>(null);
  const [billingEntries, setBillingEntries] = useState<BillingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'billed' | 'paid' | 'disputed'>('all');
  const [dateRange, setDateRange] = useState<'all' | 'month' | 'quarter' | 'year'>('all');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadBillingHistory();
    }
  }, [user, orderId, customerId, providerId, filter, dateRange]);

  const loadBillingHistory = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Query für Aufträge mit abgerechneten TimeEntries
      let ordersQuery;

      if (providerId) {
        // Lade Aufträge des Providers
        ordersQuery = query(
          collection(db, 'auftraege'),
          where('selectedAnbieterId', '==', providerId)
        );
      } else if (customerId) {
        // Lade Aufträge des Kunden
        ordersQuery = query(
          collection(db, 'auftraege'),
          where('customerFirebaseUid', '==', customerId)
        );
      } else if (orderId) {
        // Lade spezifischen Auftrag
        ordersQuery = query(collection(db, 'auftraege'), where('__name__', '==', orderId));
      } else {
        // Lade alle Aufträge (Admin-View)
        ordersQuery = query(collection(db, 'auftraege'));
      }

      const ordersSnapshot = await getDocs(ordersQuery);
      const billingEntries: BillingEntry[] = [];

      for (const orderDoc of ordersSnapshot.docs) {
        const orderData = orderDoc.data() as any; // Verwende any für vollständigen Zugriff auf Auftrag-Felder

        // Prüfe ob TimeTracking existiert und abgerechnete Entries vorhanden sind
        if (orderData.timeTracking && orderData.timeTracking.timeEntries) {
          const billedEntries = orderData.timeTracking.timeEntries.filter(
            entry => entry.status === 'billed'
          );

          for (const timeEntry of billedEntries) {
            // Finde zugehörige Approval Request
            const approvalRequest = orderData.approvalRequests?.find(request =>
              request.timeEntryIds.includes(timeEntry.id)
            );

            if (approvalRequest && timeEntry.billableAmount) {
              billingEntries.push({
                id: `${orderDoc.id}_${timeEntry.id}`,
                orderId: orderDoc.id,
                orderTitle:
                  orderData.selectedSubcategory || orderData.description || 'Unbenannter Auftrag',
                providerName:
                  orderData.providerName ||
                  orderData.selectedAnbieterName ||
                  'Unbekannter Anbieter',
                customerName: orderData.customerName || 'Unbekannter Kunde',
                timeEntry,
                approvalRequest,
                billedAmount: timeEntry.billableAmount,
                billedAt: timeEntry.customerResponseAt?.toDate() || new Date(),
                status: 'billed', // In echter Implementierung aus Payment-Status
                hourlyRate: orderData.timeTracking.hourlyRate,
              });
            }
          }
        }
      }

      // Apply filters
      let filteredEntries = billingEntries;

      if (filter !== 'all') {
        filteredEntries = filteredEntries.filter(entry => entry.status === filter);
      }

      if (dateRange !== 'all') {
        const now = new Date();
        const cutoff = new Date();

        switch (dateRange) {
          case 'month':
            cutoff.setMonth(now.getMonth() - 1);
            break;
          case 'quarter':
            cutoff.setMonth(now.getMonth() - 3);
            break;
          case 'year':
            cutoff.setFullYear(now.getFullYear() - 1);
            break;
        }

        filteredEntries = filteredEntries.filter(entry => entry.billedAt >= cutoff);
      }

      setBillingEntries(filteredEntries);
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'billed':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'disputed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amountInCents: number) => {
    return (amountInCents / 100).toFixed(2) + ' EUR';
  };

  const getTotalAmount = () => {
    return billingEntries.reduce((sum, entry) => sum + entry.billedAmount, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Lade Abrechnungshistorie...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
          <FiDollarSign className="mr-2" />
          Abrechnungshistorie
        </h2>
        <div className="text-lg font-medium text-gray-700">
          Gesamt: {formatCurrency(getTotalAmount())}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value="all">Alle</option>
            <option value="billed">Abgerechnet</option>
            <option value="paid">Bezahlt</option>
            <option value="disputed">Streitig</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Zeitraum:</label>
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value="all">Alle</option>
            <option value="month">Letzter Monat</option>
            <option value="quarter">Letztes Quartal</option>
            <option value="year">Letztes Jahr</option>
          </select>
        </div>
      </div>

      {/* Billing Entries */}
      {billingEntries.length === 0 ? (
        <div className="text-center py-8">
          <FiDollarSign className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Keine Abrechnungen</h3>
          <p className="mt-1 text-sm text-gray-500">
            Es wurden noch keine zusätzlichen Stunden abgerechnet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {billingEntries.map(entry => (
            <div key={entry.id} className="bg-white rounded-lg shadow border p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">{entry.orderTitle}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(entry.status)}`}
                    >
                      {entry.status === 'billed'
                        ? 'Abgerechnet'
                        : entry.status === 'paid'
                          ? 'Bezahlt'
                          : 'Streitig'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <strong>Anbieter:</strong> {entry.providerName}
                    </div>
                    <div>
                      <strong>Kunde:</strong> {entry.customerName}
                    </div>
                    <div className="flex items-center">
                      <FiCalendar className="mr-1" />
                      <strong>Datum:</strong> {entry.timeEntry.date}
                    </div>
                    <div className="flex items-center">
                      <FiClock className="mr-1" />
                      <strong>Stunden:</strong> {entry.timeEntry.hours}h
                    </div>
                  </div>

                  <div className="mt-3">
                    <strong className="text-sm text-gray-700">Beschreibung:</strong>
                    <p className="text-sm text-gray-600 mt-1">{entry.timeEntry.description}</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(entry.billedAmount)}
                  </div>
                  <div className="text-sm text-gray-500">
                    Abgerechnet am {entry.billedAt.toLocaleDateString('de-DE')}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex justify-end space-x-2">
                <button className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                  <FiEye className="mr-1" />
                  Details
                </button>
                {entry.status === 'billed' && (
                  <>
                    <button className="inline-flex items-center px-3 py-1 border border-green-300 rounded-md text-sm text-green-700 hover:bg-green-50">
                      <FiCheck className="mr-1" />
                      Als bezahlt markieren
                    </button>
                    <button className="inline-flex items-center px-3 py-1 border border-red-300 rounded-md text-sm text-red-700 hover:bg-red-50">
                      <FiX className="mr-1" />
                      Bestreiten
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
