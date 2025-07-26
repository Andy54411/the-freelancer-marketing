// /Users/andystaudinger/Tasko/src/components/CustomerApprovalInterface.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { FiClock, FiCheck, FiX, FiAlertCircle, FiEye } from 'react-icons/fi';
import { CustomerApprovalRequest, TimeEntry } from '@/types/timeTracking';
import { TimeTracker } from '@/lib/timeTracker';
import { auth } from '@/firebase/clients';
import { onAuthStateChanged, User } from 'firebase/auth';

interface CustomerApprovalInterfaceProps {
  orderId: string;
  onApprovalProcessed?: () => void;
}

export default function CustomerApprovalInterface({
  orderId,
  onApprovalProcessed,
}: CustomerApprovalInterfaceProps) {
  const [user, setUser] = useState<User | null>(null);
  const [approvalRequests, setApprovalRequests] = useState<CustomerApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState('');
  const [showDetails, setShowDetails] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      if (currentUser) {
        loadApprovalRequests();
      }
    });

    return () => unsubscribe();
  }, [orderId]);

  const loadApprovalRequests = async () => {
    // TODO: Muss an neue integrierte Struktur angepasst werden
    // Temporär deaktiviert für Build-Erfolg
    try {
      setLoading(true);
      setApprovalRequests([]);
    } catch (error) {
      console.error('Error loading approval requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (
    requestId: string,
    decision: 'approved' | 'rejected' | 'partially_approved'
  ) => {
    if (!user) return;

    try {
      setProcessing(true);

      const approvedIds =
        decision === 'partially_approved'
          ? Array.from(selectedEntries)
          : decision === 'approved'
            ? approvalRequests.find(req => req.id === requestId)?.timeEntryIds || []
            : [];

      await TimeTracker.processCustomerApproval(
        requestId,
        user.uid,
        decision,
        approvedIds,
        feedback || undefined
      );

      await loadApprovalRequests();

      if (onApprovalProcessed) {
        onApprovalProcessed();
      }

      // Reset state
      setSelectedEntries(new Set());
      setFeedback('');

      alert(
        `Zeiterfassung ${decision === 'approved' ? 'genehmigt' : decision === 'rejected' ? 'abgelehnt' : 'teilweise genehmigt'}!`
      );
    } catch (error) {
      console.error('Error processing approval:', error);
      alert('Fehler bei der Verarbeitung der Freigabe');
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

  const calculateTotalAmount = (entries: TimeEntry[], selectedIds?: Set<string>) => {
    const relevantEntries = selectedIds
      ? entries.filter(entry => entry.id && selectedIds.has(entry.id))
      : entries;

    return relevantEntries
      .filter(entry => entry.category === 'additional')
      .reduce((sum, entry) => sum + (entry.billableAmount || 0), 0);
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f] mx-auto"></div>
        <p className="mt-2 text-gray-600">Lade Freigabe-Anfragen...</p>
      </div>
    );
  }

  if (approvalRequests.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <FiClock size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium">Keine Freigabe-Anfragen</p>
          <p className="text-sm">Derzeit gibt es keine zusätzlichen Stunden zur Freigabe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {approvalRequests.map(request => (
        <div key={request.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FiAlertCircle className="text-orange-500" />
                  Zusätzliche Stunden zur Freigabe
                </h3>
                <p className="text-sm text-gray-600">
                  Eingereicht am{' '}
                  {new Date(request.submittedAt.seconds * 1000).toLocaleDateString('de-DE')}
                </p>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {request.totalHours.toFixed(1)}h
                </div>
                <div className="text-lg font-semibold text-orange-600">
                  +{(request.totalAmount / 100).toFixed(2)}€
                </div>
              </div>
            </div>

            {request.providerMessage && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900 font-medium">Nachricht vom Dienstleister:</p>
                <p className="text-sm text-blue-800">{request.providerMessage}</p>
              </div>
            )}
          </div>

          {/* Time Entries */}
          <div className="p-6">
            <div className="space-y-3">
              {/* TODO: Anpassung an neue integrierte Struktur erforderlich */}
              <div className="p-4 text-center text-gray-500">
                <p>
                  Diese Komponente muss an die neue integrierte TimeTracker-Struktur angepasst
                  werden.
                </p>
                <p className="text-sm mt-1">
                  Verwenden Sie die TimeTrackingManager-Komponente für TimeTracking-Funktionen.
                </p>
              </div>
            </div>

            {/* Selection Summary - Temporär deaktiviert */}
            {selectedEntries.size > 0 && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-900">
                  <span className="font-medium">{selectedEntries.size} Einträge ausgewählt</span>
                  {' • '}
                  <span className="font-medium">Berechnung wird überarbeitet</span>
                </p>
              </div>
            )}

            {/* Feedback */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Feedback (optional)
              </label>
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                placeholder="Ihr Kommentar zu den zusätzlichen Stunden..."
              />
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => request.id && handleApproval(request.id, 'rejected')}
                disabled={processing}
                className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <FiX size={16} />
                Alle ablehnen
              </button>

              {selectedEntries.size > 0 && selectedEntries.size < request.timeEntryIds.length && (
                <button
                  onClick={() => request.id && handleApproval(request.id, 'partially_approved')}
                  disabled={processing}
                  className="flex items-center gap-2 px-4 py-2 border border-orange-300 text-orange-700 rounded-md hover:bg-orange-50 transition-colors disabled:opacity-50"
                >
                  <FiCheck size={16} />
                  Auswahl genehmigen ({selectedEntries.size})
                </button>
              )}

              <button
                onClick={() => request.id && handleApproval(request.id, 'approved')}
                disabled={processing}
                className="flex items-center gap-2 px-4 py-2 bg-[#14ad9f] text-white rounded-md hover:bg-[#129488] transition-colors disabled:opacity-50"
              >
                <FiCheck size={16} />
                Alle genehmigen
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
