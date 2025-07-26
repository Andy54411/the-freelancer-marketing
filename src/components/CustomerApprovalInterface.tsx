// /Users/andystaudinger/Tasko/src/components/CustomerApprovalInterface.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FiClock, FiCheck, FiX, FiAlertCircle } from 'react-icons/fi';
import { CustomerApprovalRequest, TimeEntry } from '@/types/timeTracking';
import { TimeTracker } from '@/lib/timeTracker';
import { TimeTrackingMigration } from '@/lib/timeTrackingMigration';
import { auth } from '@/firebase/clients';
import { onAuthStateChanged, User } from 'firebase/auth';
import InlinePaymentComponent from './InlinePaymentComponent';

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
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState('');
  const [showCompleteApproval, setShowCompleteApproval] = useState(false);
  const [completeApprovalFeedback, setCompleteApprovalFeedback] = useState('');
  const [showInlinePayment, setShowInlinePayment] = useState(false);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentHours, setPaymentHours] = useState(0);

  const loadApprovalRequests = useCallback(async () => {
    try {
      setLoading(true);
      if (!user) return;

      // Hole Auftrag-Details direkt und prüfe auf ausstehende Approval Requests
      const orderDetails = await TimeTracker.getOrderDetails(orderId);

      // Speichere Order Details im State für UI-Anzeige
      setOrderDetails(orderDetails);

      // DEBUG: Logge den kompletten Zustand für Troubleshooting
      console.log('🔍 [CustomerApprovalInterface] Debug Order Details:', {
        orderId,
        hasOrderDetails: !!orderDetails,
        hasTimeTracking: !!orderDetails?.timeTracking,
        timeEntriesCount: orderDetails?.timeTracking?.timeEntries?.length || 0,
        hasApprovalRequests: !!orderDetails?.approvalRequests,
        approvalRequestsCount: orderDetails?.approvalRequests?.length || 0,
        timeTrackingData: orderDetails?.timeTracking
          ? {
              originalPlannedHours: orderDetails.timeTracking.originalPlannedHours,
              totalLoggedHours: orderDetails.timeTracking.totalLoggedHours,
              totalApprovedHours: orderDetails.timeTracking.totalApprovedHours,
              status: orderDetails.timeTracking.status,
            }
          : null,
        timeEntries:
          orderDetails?.timeTracking?.timeEntries?.map((e: any) => ({
            id: e.id,
            category: e.category,
            status: e.status,
            hours: e.hours,
            description: e.description.substring(0, 50) + '...',
            date: e.date,
          })) || [],
        approvalRequests:
          orderDetails?.approvalRequests?.map((r: any) => ({
            id: r.id,
            status: r.status,
            timeEntryIds: r.timeEntryIds,
            totalHours: r.totalHours,
          })) || [],
      });

      if (orderDetails && orderDetails.approvalRequests) {
        const pendingRequests = orderDetails.approvalRequests.filter(
          (req: any) => req.status === 'pending'
        );

        console.log(
          '🔍 [CustomerApprovalInterface] Pending Requests Found:',
          pendingRequests.length
        );

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
        console.log('🔍 [CustomerApprovalInterface] No approval requests found');
        setApprovalRequests([]);
      }
    } catch (error) {
      console.error('Error loading approval requests:', error);
      setApprovalRequests([]);
    } finally {
      setLoading(false);
    }
  }, [orderId, user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      if (currentUser) {
        loadApprovalRequests();
      }
    });

    return () => unsubscribe();
  }, [loadApprovalRequests]);

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
        feedback?.trim() || null // leere Strings zu null konvertieren
      );

      // AUTOMATISCHE STRIPE-ABRECHNUNG: Falls Stunden genehmigt wurden
      if (
        decision === 'approved' ||
        (decision === 'partially_approved' && approvedIds.length > 0)
      ) {
        console.log(
          '💳 Starte automatische Stripe-Abrechnung für genehmigte zusätzliche Stunden...'
        );

        try {
          const billingResult = await TimeTracker.billApprovedHours(orderId);

          console.log('✅ Stripe PaymentIntent erfolgreich erstellt:', {
            paymentIntentId: billingResult.paymentIntentId,
            customerPays: billingResult.customerPays / 100,
            companyReceives: billingResult.companyReceives / 100,
            platformFee: billingResult.platformFee / 100,
            clientSecret: billingResult.clientSecret,
          });

          // Zeige Erfolgsbestätigung mit Zahlungslink
          const decisionText = decision === 'approved' ? 'genehmigt' : 'teilweise genehmigt';

          const message = `Zeiterfassung ${decisionText}!

✅ Genehmigung erfolgreich verarbeitet
💳 Stripe PaymentIntent erstellt: ${billingResult.paymentIntentId}
💰 Kunde zahlt: €${(billingResult.customerPays / 100).toFixed(2)}
🏢 Anbieter erhält: €${(billingResult.companyReceives / 100).toFixed(2)}
📊 Plattformgebühr: €${(billingResult.platformFee / 100).toFixed(2)}

Die zusätzlichen Stunden wurden zur automatischen Abrechnung freigegeben.`;

          alert(message);

          // Optional: Öffne Stripe Dashboard für Monitoring
          if (confirm('Möchten Sie das Stripe Dashboard öffnen um die Zahlung zu überwachen?')) {
            window.open(
              `https://dashboard.stripe.com/payments/${billingResult.paymentIntentId}`,
              '_blank'
            );
          }
        } catch (billingError) {
          console.error('❌ Fehler bei der automatischen Stripe-Abrechnung:', billingError);
          alert(
            `Genehmigung erfolgreich, aber Fehler bei der Abrechnung: ${billingError instanceof Error ? billingError.message : 'Unbekannter Fehler'}`
          );
        }
      } else {
        // Normale Bestätigung für andere Entscheidungen
        const decisionText = decision === 'rejected' ? 'abgelehnt' : 'teilweise genehmigt';
        alert(`Zeiterfassung ${decisionText}!`);
      }

      await loadApprovalRequests();

      if (onApprovalProcessed) {
        onApprovalProcessed();
      }

      // Reset state
      setSelectedEntries(new Set());
      setFeedback('');
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
    // Intelligente Nachrichtenerstellung basierend auf Auftragsstatus
    const hasAdditionalHours = orderDetails?.timeTracking?.timeEntries?.some(
      (e: any) => e.category === 'additional'
    );

    // Differenziere zwischen verschiedenen Zuständen der zusätzlichen Stunden
    const additionalEntries =
      orderDetails?.timeTracking?.timeEntries?.filter((e: any) => e.category === 'additional') ||
      [];

    const additionalLoggedEntries = additionalEntries.filter((e: any) => e.status === 'logged');
    const additionalApprovedEntries = additionalEntries.filter(
      (e: any) => e.status === 'customer_approved'
    );
    const additionalBilledEntries = additionalEntries.filter(
      (e: any) => e.status === 'platform_held' || e.status === 'platform_released'
    );

    const totalLoggedHours = orderDetails?.timeTracking?.totalLoggedHours || 0;
    const originalPlannedHours = orderDetails?.timeTracking?.originalPlannedHours || 0;
    const hasExtraWork = totalLoggedHours > originalPlannedHours;

    const totalApprovedAdditionalHours = additionalApprovedEntries.reduce(
      (sum: number, e: any) => sum + (e.hours || 0),
      0
    );
    const totalApprovedAdditionalAmount = additionalApprovedEntries.reduce(
      (sum: number, e: any) => sum + (e.billableAmount || 0),
      0
    );

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-6">
          <FiClock size={48} className="mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Stundenfreigabe</h2>
        </div>

        {additionalApprovedEntries.length > 0 ? (
          // Fall 1: Es gibt bereits genehmigte zusätzliche Stunden - diese müssen bezahlt werden
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <FiCheck className="text-green-600 mt-1 flex-shrink-0" size={20} />
              <div>
                <h3 className="text-lg font-medium text-green-900 mb-2">
                  Zusätzliche Stunden genehmigt - Bezahlung erforderlich
                </h3>
                <p className="text-green-800 mb-3">
                  Die zusätzlichen Arbeitsstunden wurden bereits genehmigt und müssen jetzt bezahlt
                  werden.
                </p>
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Geplant:</span>
                      <span className="font-medium ml-2">{originalPlannedHours}h</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Genehmigt:</span>
                      <span className="font-medium ml-2 text-green-600">
                        {totalApprovedAdditionalHours}h
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Kosten:</span>
                      <span className="font-medium ml-2 text-green-600">
                        €{(totalApprovedAdditionalAmount / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-green-100 rounded-lg">
                  <p className="text-sm text-green-800 mb-3">
                    <strong>Bereit zur Bezahlung der genehmigten zusätzlichen Stunden!</strong>
                  </p>
                  <button
                    onClick={async () => {
                      if (
                        !confirm(
                          `Möchten Sie die ${totalApprovedAdditionalHours.toFixed(1)} genehmigten zusätzlichen Stunden für €${(totalApprovedAdditionalAmount / 100).toFixed(2)} bezahlen?`
                        )
                      )
                        return;

                      try {
                        // Direkt zur Stripe-Abrechnung, da die Stunden bereits genehmigt sind
                        const billingResult = await TimeTracker.billApprovedHours(orderId);

                        // Setze Payment-Daten für Inline-Komponente
                        setPaymentClientSecret(billingResult.clientSecret);
                        setPaymentAmount(billingResult.customerPays);
                        setPaymentHours(totalApprovedAdditionalHours);
                        setShowInlinePayment(true);

                        // Keine Weiterleitung mehr - Payment wird inline angezeigt
                      } catch (error) {
                        console.error('Error processing approved hours billing:', error);
                        alert('Fehler beim Erstellen der Zahlung für genehmigte Stunden');
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    💳 {totalApprovedAdditionalHours.toFixed(1)}h bezahlen - €
                    {(totalApprovedAdditionalAmount / 100).toFixed(2)}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : additionalLoggedEntries.length > 0 ? (
          // Fall 2: Es gibt protokollierte zusätzliche Stunden, die zur Freigabe eingereicht werden müssen
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="text-amber-600 mt-1 flex-shrink-0" size={20} />
              <div>
                <h3 className="text-lg font-medium text-amber-900 mb-2">
                  Zusätzliche Arbeit protokolliert
                </h3>
                <p className="text-amber-800 mb-3">
                  Der Anbieter hat zusätzliche Arbeitszeit protokolliert, aber noch nicht zur
                  Freigabe eingereicht.
                </p>
                <div className="bg-white rounded-lg p-4 border border-amber-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Geplant:</span>
                      <span className="font-medium ml-2">{originalPlannedHours}h</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Protokolliert:</span>
                      <span className="font-medium ml-2">{totalLoggedHours}h</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-amber-100 rounded-lg">
                  <p className="text-sm text-amber-800 mb-3">
                    <strong>
                      Sie können die zusätzlichen Stunden selbst zur Freigabe anfordern!
                    </strong>
                  </p>
                  <button
                    onClick={async () => {
                      if (
                        !confirm(
                          `Möchten Sie die ${(totalLoggedHours - originalPlannedHours).toFixed(1)} zusätzlichen Stunden zur Freigabe einreichen und genehmigen?`
                        )
                      )
                        return;

                      try {
                        // Schritt 1: Kunde-initiierte Freigabe
                        const result = await TimeTracker.customerInitiateAdditionalHoursApproval(
                          orderId,
                          'Kunde möchte zusätzliche Arbeitszeit freigeben'
                        );

                        if (result.success && result.approvalRequestId) {
                          // Schritt 2: Sofort genehmigen
                          await TimeTracker.processCustomerApproval(
                            orderId,
                            result.approvalRequestId,
                            'approved',
                            undefined,
                            'Automatisch genehmigt durch Kunde-Initiative'
                          );

                          // Schritt 3: Automatische Stripe-Abrechnung
                          const billingResult = await TimeTracker.billApprovedHours(orderId);

                          alert(
                            `✅ Erfolgreich!\n\n${result.additionalHours.toFixed(1)} zusätzliche Stunden wurden freigegeben und zur Abrechnung eingereicht.\n\nKosten: €${(billingResult.customerPays / 100).toFixed(2)}`
                          );

                          await loadApprovalRequests();
                        } else {
                          alert(result.message);
                        }
                      } catch (error) {
                        console.error('Error processing customer-initiated approval:', error);
                        alert('Fehler beim Freigeben der zusätzlichen Stunden');
                      }
                    }}
                    className="px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-[#0f8a7e] transition-colors font-medium"
                  >
                    🚀 {(totalLoggedHours - originalPlannedHours).toFixed(1)}h zusätzliche
                    Arbeitszeit freigeben
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : hasExtraWork ? (
          // Fall 3: Mehr Stunden protokolliert als geplant, aber nicht als "zusätzlich" kategorisiert
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="text-blue-600 mt-1 flex-shrink-0" size={20} />
              <div>
                <h3 className="text-lg font-medium text-blue-900 mb-2">
                  Arbeitszeit-Überprüfung erforderlich
                </h3>
                <p className="text-blue-800 mb-3">
                  Es wurden mehr Stunden protokolliert als ursprünglich geplant.
                </p>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Geplant:</span>
                      <span className="font-medium ml-2">{originalPlannedHours}h</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Protokolliert:</span>
                      <span className="font-medium ml-2 text-blue-600">{totalLoggedHours}h</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Der Anbieter sollte prüfen, ob zusätzliche Arbeit als &ldquo;Zusätzliche
                    Stunden&rdquo; kategorisiert und zur Freigabe eingereicht werden muss.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Fall 4: Alles normal, keine zusätzlichen Stunden
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <FiCheck className="text-green-600 mt-1 flex-shrink-0" size={20} />
              <div>
                <h3 className="text-lg font-medium text-green-900 mb-2">
                  Keine zusätzlichen Stunden
                </h3>
                <p className="text-green-800 mb-3">
                  Der Auftrag wird planmäßig ohne zusätzliche Arbeitszeit durchgeführt.
                </p>
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <div className="text-sm">
                    <span className="text-gray-600">Geplante Arbeitszeit:</span>
                    <span className="font-medium ml-2">{originalPlannedHours}h</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Automatische Aktualisierung Hinweis */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-600">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
            Diese Seite wird automatisch aktualisiert
          </div>
        </div>

        {/* Admin/Debug-Bereich - nur für Development oder Admin-Users */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-8 border border-gray-200 rounded-lg">
            <summary className="px-4 py-2 bg-gray-50 font-medium text-sm text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors">
              🔧 Admin-Tools & Debug-Informationen
            </summary>
            <div className="p-4 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 space-y-2">
                  <div>
                    <strong>Order ID:</strong> {orderId}
                  </div>
                  <div>
                    <strong>Geplante Stunden:</strong> {originalPlannedHours}h
                  </div>
                  <div>
                    <strong>Protokollierte Stunden:</strong> {totalLoggedHours}h
                  </div>
                  <div>
                    <strong>Original Stunden:</strong>{' '}
                    {orderDetails?.timeTracking?.timeEntries
                      ?.filter((e: any) => e.category === 'original')
                      .reduce((sum: number, e: any) => sum + e.hours, 0) || 0}
                    h
                  </div>
                  <div>
                    <strong>Zusätzliche Stunden:</strong>{' '}
                    {orderDetails?.timeTracking?.timeEntries
                      ?.filter((e: any) => e.category === 'additional')
                      .reduce((sum: number, e: any) => sum + e.hours, 0) || 0}
                    h
                  </div>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={async () => {
                    await loadApprovalRequests();
                    alert('Daten neu geladen');
                  }}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  � Daten neu laden
                </button>

                <button
                  onClick={async () => {
                    if (!confirm('TimeTracking für diesen Auftrag korrigieren?')) return;
                    try {
                      await TimeTrackingMigration.fixTimeTrackingForOrder(orderId);
                      await loadApprovalRequests();
                      alert('TimeTracking erfolgreich korrigiert!');
                    } catch (error) {
                      alert(`Fehler: ${error}`);
                    }
                  }}
                  className="px-3 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                >
                  🔧 TimeTracking korrigieren
                </button>
              </div>
            </div>
          </details>
        )}
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

      {/* Inline Payment Component */}
      {showInlinePayment && paymentClientSecret && (
        <InlinePaymentComponent
          clientSecret={paymentClientSecret}
          orderId={orderId}
          totalAmount={paymentAmount}
          totalHours={paymentHours}
          isOpen={showInlinePayment}
          onClose={() => {
            setShowInlinePayment(false);
            setPaymentClientSecret(null);
            setPaymentAmount(0);
            setPaymentHours(0);
          }}
          onSuccess={async paymentIntentId => {
            console.log('Payment successful:', paymentIntentId);

            // Schließe Payment Modal
            setShowInlinePayment(false);
            setPaymentClientSecret(null);
            setPaymentAmount(0);
            setPaymentHours(0);

            // Zeige Erfolgsmeldung
            alert(
              `✅ Zahlung erfolgreich!\n\nPayment ID: ${paymentIntentId}\n\nDie zusätzlichen Stunden wurden erfolgreich bezahlt.`
            );

            // Aktualisiere die Daten
            await loadApprovalRequests();

            // Callback für Parent-Komponente
            if (onApprovalProcessed) {
              onApprovalProcessed();
            }
          }}
          onError={error => {
            console.error('Payment error:', error);
            alert(`❌ Zahlungsfehler:\n\n${error}\n\nBitte versuchen Sie es erneut.`);
          }}
        />
      )}
    </div>
  );
}
