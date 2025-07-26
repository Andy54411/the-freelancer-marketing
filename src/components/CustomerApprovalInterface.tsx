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
  const [showCompleteApproval, setShowCompleteApproval] = useState(false);
  const [completeApprovalFeedback, setCompleteApprovalFeedback] = useState('');

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
    try {
      setLoading(true);
      if (!user) return;

      // Hole Auftrag-Details direkt und prüfe auf ausstehende Approval Requests
      const orderDetails = await TimeTracker.getOrderDetails(orderId);

      // DEBUG: Log order details
      console.log('[DEBUG] Order Details for', orderId, ':', orderDetails);
      console.log('[DEBUG] TimeTracking:', orderDetails?.timeTracking);
      console.log('[DEBUG] Approval Requests:', orderDetails?.approvalRequests);

      if (orderDetails && orderDetails.approvalRequests) {
        const pendingRequests = orderDetails.approvalRequests.filter(
          (req: any) => req.status === 'pending'
        );

        console.log('[DEBUG] Pending Requests:', pendingRequests);

        // Erweitere Requests mit TimeEntry-Details aus dem Auftrag
        const enrichedRequests = pendingRequests.map((request: any) => {
          const timeEntries: TimeEntry[] = [];
          if (orderDetails.timeTracking && orderDetails.timeTracking.timeEntries) {
            for (const entryId of request.timeEntryIds) {
              const entry = orderDetails.timeTracking.timeEntries.find(
                (e: any) => e.id === entryId
              );
              if (entry) {
                timeEntries.push(entry);
              }
            }
          }

          return {
            ...request,
            timeEntries, // Füge TimeEntries für Anzeige hinzu
          };
        });

        setApprovalRequests(enrichedRequests);
      } else {
        setApprovalRequests([]);
      }
    } catch (error) {
      console.error('Error loading approval requests:', error);
      setApprovalRequests([]);
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

      // Korrekte Parameter-Reihenfolge für processCustomerApproval
      await TimeTracker.processCustomerApproval(
        orderId, // orderId zuerst
        requestId, // dann approvalRequestId
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

  const handleCompleteOrderApproval = async () => {
    if (!user) return;

    const confirmMessage = `Sind Sie sicher, dass Sie den kompletten Auftrag freigeben möchten? 
    
Dies wird:
• ALLE ausstehenden Stunden genehmigen
• Den Auftrag als ABGESCHLOSSEN markieren
• Keine weiteren Änderungen zulassen

Diese Aktion kann nicht rückgängig gemacht werden.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setProcessing(true);

      await TimeTracker.approveCompleteOrder(orderId, completeApprovalFeedback || undefined);

      if (onApprovalProcessed) {
        onApprovalProcessed();
      }

      // Reset state
      setCompleteApprovalFeedback('');
      setShowCompleteApproval(false);

      alert('Kompletter Auftrag wurde freigegeben und abgeschlossen!');

      // Lade Approval Requests neu (sollten jetzt leer sein)
      await loadApprovalRequests();
    } catch (error) {
      console.error('Error processing complete order approval:', error);
      alert('Fehler bei der kompletten Auftragsfreigabe');
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
      {/* Komplette Auftragsfreigabe - nur anzeigen wenn Approval Requests vorhanden */}
      {approvalRequests.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FiCheck className="text-green-600" />
                Kompletten Auftrag freigeben
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Alle ausstehenden Stunden genehmigen und Auftrag als abgeschlossen markieren
              </p>
            </div>

            <button
              onClick={() => setShowCompleteApproval(!showCompleteApproval)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
            >
              {showCompleteApproval ? 'Ausblenden' : 'Auftrag freigeben'}
            </button>
          </div>

          {showCompleteApproval && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FiAlertCircle className="text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">Wichtiger Hinweis</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Diese Aktion genehmigt <strong>ALLE</strong> ausstehenden Stunden und markiert
                      den Auftrag als
                      <strong> ABGESCHLOSSEN</strong>. Dies kann nicht rückgängig gemacht werden.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Abschlussfeedback (optional)
                </label>
                <textarea
                  value={completeApprovalFeedback}
                  onChange={e => setCompleteApprovalFeedback(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Ihr Feedback zum gesamten Auftrag..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCompleteApproval(false)}
                  disabled={processing}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleCompleteOrderApproval}
                  disabled={processing}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
                >
                  {processing ? 'Wird verarbeitet...' : 'Auftrag komplett freigeben'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bestehende Approval Requests */}
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
              {request.timeEntries && request.timeEntries.length > 0 ? (
                request.timeEntries.map((entry: TimeEntry) => (
                  <div
                    key={entry.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedEntries.has(entry.id)
                        ? 'border-[#14ad9f] bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleEntrySelection(entry.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedEntries.has(entry.id)}
                              onChange={() => toggleEntrySelection(entry.id)}
                              className="w-4 h-4 text-[#14ad9f] border-gray-300 rounded focus:ring-[#14ad9f]"
                            />
                            <span className="text-sm font-medium text-gray-900">
                              {new Date(entry.date).toLocaleDateString('de-DE')}
                            </span>
                          </div>

                          <div className="text-sm text-gray-600">
                            {entry.startTime}
                            {entry.endTime && ` - ${entry.endTime}`}
                          </div>

                          <div className="text-sm font-medium text-gray-900">
                            {entry.hours.toFixed(1)}h
                          </div>

                          {entry.category === 'additional' && entry.billableAmount && (
                            <div className="text-sm font-semibold text-orange-600">
                              +{(entry.billableAmount / 100).toFixed(2)}€
                            </div>
                          )}
                        </div>

                        <div className="mt-2">
                          <p className="text-sm text-gray-700">{entry.description}</p>
                          {entry.notes && (
                            <p className="text-xs text-gray-500 mt-1">Notiz: {entry.notes}</p>
                          )}
                        </div>

                        <div className="mt-2 flex gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              entry.category === 'additional'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {entry.category === 'additional' ? 'Zusätzlich' : 'Original geplant'}
                          </span>

                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              entry.status === 'submitted'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {entry.status === 'submitted'
                              ? 'Zur Freigabe eingereicht'
                              : entry.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">
                  <p>Keine Zeiteinträge für diese Anfrage gefunden.</p>
                </div>
              )}
            </div>

            {/* Selection Summary */}
            {selectedEntries.size > 0 && request.timeEntries && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-900">
                  <span className="font-medium">{selectedEntries.size} Einträge ausgewählt</span>
                  {' • '}
                  <span className="font-medium">
                    {(calculateTotalAmount(request.timeEntries, selectedEntries) / 100).toFixed(2)}€
                  </span>
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
