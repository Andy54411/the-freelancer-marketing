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

          // Öffne Inline Payment Modal statt Alert
          setPaymentClientSecret(billingResult.clientSecret);
          setPaymentAmount(billingResult.customerPays);
          setPaymentHours(
            orderDetails?.timeTracking?.timeEntries
              ?.filter((e: any) => e.category === 'additional' && e.status === 'customer_approved')
              ?.reduce((sum: number, e: any) => sum + e.hours, 0) || 0
          );
          setShowInlinePayment(true);

          console.log('🔓 Inline Payment Modal geöffnet:', {
            clientSecret: billingResult.clientSecret,
            amount: billingResult.customerPays / 100,
            paymentIntentId: billingResult.paymentIntentId,
          });
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

  /**
   * SICHERHEITSFUNKTION: Automatische Erkennung und Freigabe unbezahlter Stunden
   * Diese Funktion stellt sicher, dass ALLE geleisteten Stunden korrekt erkannt und abgerechnet werden
   */
  const initiatePaymentForUnpaidHours = async (unpaidHours: number, orderId: string) => {
    try {
      console.log('🔄 [PAYMENT SECURITY] Starting automatic unpaid hours processing:', {
        unpaidHours,
        orderId,
        timestamp: new Date().toISOString(),
      });

      // Schritt 1: Kunde-initiierte Freigabe für alle unbezahlten Stunden
      const result = await TimeTracker.customerInitiateAdditionalHoursApproval(
        orderId,
        `SICHERHEITS-FREIGABE: ${unpaidHours.toFixed(1)}h unbezahlte Arbeitszeit automatisch zur Freigabe eingereicht`
      );

      if (result.success && result.approvalRequestId) {
        console.log('✅ [PAYMENT SECURITY] Approval request created:', result.approvalRequestId);

        // Schritt 2: Sofortige automatische Genehmigung
        await TimeTracker.processCustomerApproval(
          orderId,
          result.approvalRequestId,
          'approved',
          undefined,
          `AUTOMATISCHE GENEHMIGUNG: ${unpaidHours.toFixed(1)}h zur Sicherstellung vollständiger Bezahlung`
        );

        console.log('✅ [PAYMENT SECURITY] Hours automatically approved');

        // Schritt 3: Direkte Stripe-Abrechnung
        const billingResult = await TimeTracker.billApprovedHours(orderId);

        console.log('✅ [PAYMENT SECURITY] Payment Intent created:', {
          paymentIntentId: billingResult.paymentIntentId,
          amount: billingResult.customerPays / 100,
        });

        // Schritt 4: Öffne Inline Payment Modal
        setPaymentClientSecret(billingResult.clientSecret);
        setPaymentAmount(billingResult.customerPays);
        setPaymentHours(result.additionalHours);
        setShowInlinePayment(true);

        console.log('🔓 [PAYMENT SECURITY] Payment Modal opened for security payment');

        return true;
      } else {
        console.warn('⚠️ [PAYMENT SECURITY] Failed to create approval request:', result.message);
        return false;
      }
    } catch (error) {
      console.error('❌ [PAYMENT SECURITY] Error in automatic payment processing:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';

      // Spezielle Behandlung für bekannte Stripe Connect Probleme
      if (
        errorMessage.includes('PAYMENT SETUP ERFORDERLICH') ||
        errorMessage.includes('Stripe Connect')
      ) {
        alert(
          '⚠️ ZAHLUNGSEINRICHTUNG ERFORDERLICH\n\n' +
            'Der Dienstleister muss seine Stripe Connect Einrichtung abschließen.\n\n' +
            'Bitte kontaktieren Sie den Support oder warten Sie, bis der Dienstleister seine Zahlungseinrichtung vollendet hat.\n\n' +
            `Unbezahlte Stunden: ${unpaidHours.toFixed(1)}h`
        );
      } else {
        alert(
          `❌ FEHLER BEI AUTOMATISCHER STUNDENABRECHNUNG\n\n` +
            `${errorMessage}\n\n` +
            `Unbezahlte Stunden: ${unpaidHours.toFixed(1)}h\n` +
            `Bitte versuchen Sie es erneut oder kontaktieren Sie den Support.`
        );
      }

      return false;
    }
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

    // KORRIGIERTE LOGIK: Erfasse ALLE genehmigten/bezahlten zusätzlichen Stunden
    const additionalApprovedEntries = additionalEntries.filter((e: any) => {
      // Alle Stunden die genehmigt oder bereits bezahlt sind
      return (
        e.status === 'customer_approved' ||
        e.status === 'billing_pending' || // ← WICHTIG: Diese werden in DB als "billing_pending" gespeichert
        e.status === 'billed' ||
        e.status === 'platform_held' ||
        e.status === 'platform_released' ||
        e.status === 'escrow_authorized' ||
        e.status === 'escrow_released' ||
        e.status === 'transferred' ||
        e.paymentIntentId || // Hat PaymentIntent = bereits abgerechnet
        e.platformHoldPaymentIntentId ||
        e.escrowPaymentIntentId
      );
    });

    const totalLoggedHours = orderDetails?.timeTracking?.totalLoggedHours || 0;
    const originalPlannedHours = orderDetails?.timeTracking?.originalPlannedHours || 0;

    // KORRIGIERTE LOGIK: Unterscheide zwischen GENEHMIGT und TATSÄCHLICH BEZAHLT
    // billing_pending = genehmigt aber NOCH NICHT bezahlt!
    const totalPaidAdditionalHours = additionalEntries
      .filter((e: any) => {
        // NUR WIRKLICH BEZAHLTE Status-Arten erfassen (OHNE billing_pending!):
        const isPaidStatus =
          e.status === 'billed' || // Legacy: Direkt abgerechnet
          e.status === 'platform_held' || // Platform Hold System: Geld gehalten
          e.status === 'platform_released' || // Platform Hold System: Geld freigegeben
          e.status === 'escrow_authorized' || // Legacy Escrow: Autorisiert
          e.status === 'escrow_released' || // Legacy Escrow: Freigegeben
          e.status === 'transferred' || // Übertragen
          e.platformHoldStatus === 'held' || // Platform Hold Status
          e.platformHoldStatus === 'transferred' || // Platform zu Provider übertragen
          e.escrowStatus === 'authorized' || // Legacy Escrow Status
          e.escrowStatus === 'released'; // Legacy Escrow freigegeben
        // WICHTIG: billing_pending ist NICHT hier, weil das bedeutet "genehmigt aber noch nicht bezahlt"!

        // Debug: Logge für Transparenz
        if (isPaidStatus) {
          console.log('🔍 [ACTUALLY PAID HOUR DETECTED]:', {
            entryId: e.id,
            hours: e.hours,
            status: e.status,
            platformHoldStatus: e.platformHoldStatus,
            escrowStatus: e.escrowStatus,
            category: e.category,
            reason: 'MONEY_ACTUALLY_TRANSFERRED',
          });
        }

        return isPaidStatus;
      })
      .reduce((sum: number, e: any) => sum + (e.hours || 0), 0);

    // Berechne Stunden die genehmigt sind aber noch bezahlt werden müssen
    const totalBillingPendingHours = additionalEntries
      .filter((e: any) => e.status === 'billing_pending')
      .reduce((sum: number, e: any) => sum + (e.hours || 0), 0);

    // Nur die Stunden zählen, die wirklich noch nicht bezahlt sind
    const unpaidAdditionalHours = Math.max(
      0,
      totalLoggedHours - originalPlannedHours - totalPaidAdditionalHours
    );

    // SICHERHEITS-CHECK: Zusätzliche Validierung
    const totalAdditionalHours = additionalEntries.reduce(
      (sum: number, e: any) => sum + (e.hours || 0),
      0
    );
    const calculatedUnpaidHours = Math.max(0, totalLoggedHours - originalPlannedHours);

    console.log('🔍 [PAYMENT STATUS ANALYSIS]:', {
      orderId,
      originalPlannedHours,
      totalLoggedHours,
      totalAdditionalHours,
      totalPaidAdditionalHours,
      totalBillingPendingHours,
      calculatedUnpaidHours,
      unpaidAdditionalHours,
      actuallyPaidEntriesCount: additionalEntries.filter((e: any) => {
        return (
          e.status === 'billed' ||
          e.status === 'platform_held' ||
          e.status === 'platform_released' ||
          e.status === 'escrow_authorized' ||
          e.status === 'escrow_released' ||
          e.status === 'transferred' ||
          e.platformHoldStatus === 'held' ||
          e.platformHoldStatus === 'transferred' ||
          e.escrowStatus === 'authorized' ||
          e.escrowStatus === 'released'
        );
      }).length,
      billingPendingEntriesCount: additionalEntries.filter(
        (e: any) => e.status === 'billing_pending'
      ).length,
      additionalEntriesBreakdown: additionalEntries.map((e: any) => ({
        id: e.id,
        hours: e.hours,
        status: e.status,
        category: e.category,
        platformHoldStatus: e.platformHoldStatus,
        escrowStatus: e.escrowStatus,
        hasPaymentIntent: !!(
          e.paymentIntentId ||
          e.platformHoldPaymentIntentId ||
          e.escrowPaymentIntentId
        ),
      })),
    });
    const hasUnpaidExtraWork = unpaidAdditionalHours > 0;

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
                  Zusätzliche Stunden genehmigt - Bezahlung erforderlich!
                </h3>
                <p className="text-green-800 mb-3">
                  {totalBillingPendingHours > 0
                    ? `${totalBillingPendingHours}h zusätzliche Stunden sind genehmigt und müssen JETZT bezahlt werden!`
                    : 'Die zusätzlichen Arbeitsstunden wurden bereits genehmigt und müssen jetzt bezahlt werden.'}
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
                      <span className="text-gray-600">Status:</span>
                      <span className="font-medium ml-2 text-red-600">
                        {totalBillingPendingHours > 0 ? 'BEZAHLUNG ERFORDERLICH!' : 'Genehmigt'}
                      </span>
                    </div>
                  </div>
                  {totalApprovedAdditionalAmount > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-sm">
                        <span className="text-gray-600">Gesamtkosten:</span>
                        <span className="font-medium ml-2 text-green-600">
                          €{(totalApprovedAdditionalAmount / 100).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Debug-Informationen für bessere Transparenz */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs">
                  <div className="text-blue-800">
                    <p>
                      <strong>Debug-Info:</strong>
                    </p>
                    <p>• Zusätzliche Einträge gesamt: {additionalEntries.length}</p>
                    <p>• Davon genehmigt: {additionalApprovedEntries.length}</p>
                    <p>• Genehmigt aber unbezahlt (billing_pending): {totalBillingPendingHours}h</p>
                    <p>• Tatsächlich bezahlt: {totalPaidAdditionalHours}h</p>
                    <p>• Neue unbezahlte Stunden: {unpaidAdditionalHours}h</p>
                  </div>
                </div>

                {/* BEZAHLUNG FÜR GENEHMIGE STUNDEN - IMMER ANZEIGEN WENN billing_pending > 0 */}
                {totalBillingPendingHours > 0 && totalApprovedAdditionalAmount > 0 && (
                  <div className="mt-4 p-3 bg-red-100 rounded-lg border border-red-300">
                    <p className="text-sm text-red-800 mb-3">
                      <strong>🚨 SOFORTIGE BEZAHLUNG ERFORDERLICH!</strong>
                    </p>
                    <p className="text-sm text-red-700 mb-3">
                      {totalBillingPendingHours}h sind bereits genehmigt, aber die Bezahlung steht
                      noch aus!
                    </p>
                    <button
                      onClick={async e => {
                        console.log('🚨 JETZT BEZAHLEN Button geklickt!', {
                          totalBillingPendingHours,
                          totalApprovedAdditionalAmount,
                          orderId,
                        });

                        // Event propagation stoppen
                        e.preventDefault();
                        e.stopPropagation();

                        try {
                          if (
                            !confirm(
                              `🚨 BEZAHLUNG JETZT AUSFÜHREN!\n\nMöchten Sie die ${totalBillingPendingHours.toFixed(1)}h genehmigten Stunden für €${(totalApprovedAdditionalAmount / 100).toFixed(2)} SOFORT bezahlen?\n\nDiese Stunden sind bereits genehmigt und warten auf Bezahlung!`
                            )
                          ) {
                            console.log('❌ Bezahlung vom Benutzer abgebrochen');
                            return;
                          }

                          console.log('🔄 Starte Bezahlung für billing_pending Stunden...');

                          // Direkt zur Stripe-Abrechnung für billing_pending Stunden
                          const billingResult = await TimeTracker.billApprovedHours(orderId);

                          console.log('✅ Billing Result erhalten:', billingResult);

                          // Setze Payment-Daten für Inline-Komponente
                          setPaymentClientSecret(billingResult.clientSecret);
                          setPaymentAmount(billingResult.customerPays);
                          setPaymentHours(totalBillingPendingHours);
                          setShowInlinePayment(true);

                          console.log('🔓 BILLING_PENDING Payment Modal geöffnet:', {
                            clientSecret: billingResult.clientSecret,
                            amount: billingResult.customerPays / 100,
                            hours: totalBillingPendingHours,
                            showInlinePayment: true,
                          });

                          // Keine Weiterleitung mehr - Payment wird inline angezeigt
                        } catch (error) {
                          console.error(
                            '🚨 Error processing billing_pending hours payment:',
                            error
                          );

                          // Bessere Fehlerbehandlung für Stripe Connect Probleme
                          const errorMessage =
                            error instanceof Error ? error.message : 'Unbekannter Fehler';
                          if (
                            errorMessage.includes('PAYMENT SETUP ERFORDERLICH') ||
                            errorMessage.includes('Stripe Connect')
                          ) {
                            alert(
                              'Der Dienstleister muss seine Zahlungseinrichtung abschließen.\n\n' +
                                'Bitte kontaktieren Sie den Support oder warten Sie, bis der Dienstleister seine Stripe Connect Einrichtung vollendet hat.'
                            );
                          } else {
                            alert(`Fehler beim Erstellen der Zahlung: ${errorMessage}`);
                          }
                        }
                      }}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold text-lg"
                    >
                      � JETZT BEZAHLEN: {totalBillingPendingHours.toFixed(1)}h - €
                      {(totalApprovedAdditionalAmount / 100).toFixed(2)}
                    </button>
                  </div>
                )}

                {/* Zusätzlicher Bereich für neue unbezahlte Stunden */}
                {additionalLoggedEntries.length > 0 && unpaidAdditionalHours > 0 && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <h4 className="font-medium text-amber-900 mb-2">
                      🚨 Neue unbezahlte Stunden erkannt!
                    </h4>
                    <p className="text-sm text-amber-800 mb-3">
                      Der Anbieter hat {unpaidAdditionalHours}h zusätzliche Arbeitszeit
                      protokolliert, die noch nicht genehmigt und bezahlt wurde.
                    </p>
                    <button
                      onClick={async () => {
                        if (
                          !confirm(
                            `Möchten Sie die ${unpaidAdditionalHours.toFixed(1)} neuen unbezahlten zusätzlichen Stunden zur Freigabe einreichen und genehmigen?`
                          )
                        )
                          return;

                        try {
                          // Schritt 1: Kunde-initiierte Freigabe für die neuen Stunden
                          const result = await TimeTracker.customerInitiateAdditionalHoursApproval(
                            orderId,
                            'Kunde möchte weitere zusätzliche Arbeitszeit freigeben'
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

                            // Schritt 3: Öffne Inline Payment Modal
                            const billingResult = await TimeTracker.billApprovedHours(orderId);

                            // Setze Payment-Daten für Inline-Modal
                            setPaymentClientSecret(billingResult.clientSecret);
                            setPaymentAmount(billingResult.customerPays);
                            setPaymentHours(result.additionalHours);
                            setShowInlinePayment(true);

                            console.log('🔓 Neue Stunden - Inline Payment Modal geöffnet:', {
                              clientSecret: billingResult.clientSecret,
                              amount: billingResult.customerPays / 100,
                              hours: result.additionalHours,
                            });

                            // loadApprovalRequests wird nach erfolgreichem Payment aufgerufen
                          } else {
                            alert(result.message);
                          }
                        } catch (error) {
                          console.error('Error processing new additional hours approval:', error);

                          // Bessere Fehlerbehandlung für Stripe Connect Probleme
                          const errorMessage =
                            error instanceof Error ? error.message : 'Unbekannter Fehler';
                          if (
                            errorMessage.includes('PAYMENT SETUP ERFORDERLICH') ||
                            errorMessage.includes('Stripe Connect')
                          ) {
                            alert(
                              'Der Dienstleister muss seine Zahlungseinrichtung abschließen.\n\n' +
                                'Bitte kontaktieren Sie den Support oder warten Sie, bis der Dienstleister seine Stripe Connect Einrichtung vollendet hat.'
                            );
                          } else {
                            alert(
                              `Fehler beim Freigeben der neuen zusätzlichen Stunden: ${errorMessage}`
                            );
                          }
                        }
                      }}
                      className="px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-[#0f8a7e] transition-colors font-medium"
                    >
                      🚀 {unpaidAdditionalHours.toFixed(1)}h neue Stunden freigeben
                    </button>
                  </div>
                )}
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
                          `Möchten Sie die ${unpaidAdditionalHours.toFixed(1)} unbezahlten zusätzlichen Stunden zur Freigabe einreichen und genehmigen?`
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

                          // Schritt 3: Öffne Inline Payment Modal
                          const billingResult = await TimeTracker.billApprovedHours(orderId);

                          // Setze Payment-Daten für Inline-Modal
                          setPaymentClientSecret(billingResult.clientSecret);
                          setPaymentAmount(billingResult.customerPays);
                          setPaymentHours(result.additionalHours);
                          setShowInlinePayment(true);

                          console.log('🔓 Customer-initiated Inline Payment Modal geöffnet:', {
                            clientSecret: billingResult.clientSecret,
                            amount: billingResult.customerPays / 100,
                            hours: result.additionalHours,
                          });

                          // loadApprovalRequests wird nach erfolgreichem Payment aufgerufen
                        } else {
                          alert(result.message);
                        }
                      } catch (error) {
                        console.error('Error processing customer-initiated approval:', error);

                        // Bessere Fehlerbehandlung für Stripe Connect Probleme
                        const errorMessage =
                          error instanceof Error ? error.message : 'Unbekannter Fehler';
                        if (
                          errorMessage.includes('PAYMENT SETUP ERFORDERLICH') ||
                          errorMessage.includes('Stripe Connect')
                        ) {
                          alert(
                            'Der Dienstleister muss seine Zahlungseinrichtung abschließen.\n\n' +
                              'Bitte kontaktieren Sie den Support oder warten Sie, bis der Dienstleister seine Stripe Connect Einrichtung vollendet hat.'
                          );
                        } else {
                          alert(`Fehler beim Freigeben der zusätzlichen Stunden: ${errorMessage}`);
                        }
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
        ) : hasUnpaidExtraWork ? (
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
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Geplant:</span>
                      <span className="font-medium ml-2">{originalPlannedHours}h</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Protokolliert:</span>
                      <span className="font-medium ml-2 text-blue-600">{totalLoggedHours}h</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Noch nicht bezahlt:</span>
                      <span className="font-medium ml-2 text-orange-600">
                        {unpaidAdditionalHours.toFixed(1)}h
                      </span>
                    </div>
                  </div>
                  {totalPaidAdditionalHours > 0 && (
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <span className="text-sm text-gray-600">Bereits bezahlt: </span>
                      <span className="text-sm font-medium text-green-600">
                        {totalPaidAdditionalHours.toFixed(1)}h
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                  <p className="text-sm text-blue-800 mb-3">
                    <strong>
                      Sie können die unbezahlten zusätzlichen Stunden selbst zur Freigabe anfordern!
                    </strong>
                  </p>
                  <p className="text-sm text-blue-700 mb-3">
                    Der Anbieter hat vergessen, die {unpaidAdditionalHours.toFixed(1)} zusätzlichen
                    Stunden zur Freigabe einzureichen. Sie können diese selbst einreichen und sofort
                    bezahlen.
                  </p>
                  <button
                    onClick={async () => {
                      if (
                        !confirm(
                          `🔒 SICHERHEITS-FREIGABE\n\nMöchten Sie die ${unpaidAdditionalHours.toFixed(1)} unbezahlten zusätzlichen Stunden zur Freigabe einreichen und genehmigen?\n\nDies stellt sicher, dass der Anbieter für ALLE geleistete Arbeit bezahlt wird.`
                        )
                      )
                        return;

                      // Verwende die neue Sicherheitsfunktion
                      await initiatePaymentForUnpaidHours(unpaidAdditionalHours, orderId);
                    }}
                    className="px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-[#129488] transition-colors font-medium"
                  >
                    � {unpaidAdditionalHours.toFixed(1)}h SICHERHEITS-FREIGABE & Bezahlung
                  </button>
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
                  className="px-3 py-2 text-sm bg-[#14ad9f] text-white rounded hover:bg-[#129488] transition-colors"
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

            try {
              // Schritt 1: Verifikation der Zahlung über Backend API
              console.log('🔍 Verifying payment status...');
              const verifyResponse = await fetch('/api/verify-payment-status', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  paymentIntentId,
                  orderId,
                }),
              });

              if (!verifyResponse.ok) {
                throw new Error('Fehler bei der Zahlungsverifikation');
              }

              const verifyData = await verifyResponse.json();
              console.log('✅ Payment verification result:', verifyData);

              // Schritt 2: Nur bei verifizierter Zahlung UI aktualisieren
              if (verifyData.verified && verifyData.status === 'succeeded') {
                // Schließe Payment Modal
                setShowInlinePayment(false);
                setPaymentClientSecret(null);
                setPaymentAmount(0);
                setPaymentHours(0);

                // Zeige Erfolgsmeldung
                alert(
                  `✅ Zahlung erfolgreich!\n\nPayment ID: ${paymentIntentId}\n\nDie zusätzlichen Stunden wurden erfolgreich bezahlt und der Status wurde aktualisiert.`
                );

                // Aktualisiere die Daten
                await loadApprovalRequests();

                // Callback für Parent-Komponente
                if (onApprovalProcessed) {
                  onApprovalProcessed();
                }
              } else {
                throw new Error(
                  `Zahlung wurde nicht korrekt verarbeitet. Status: ${verifyData.status || 'unbekannt'}`
                );
              }
            } catch (error) {
              console.error('Payment verification failed:', error);

              // Zahlung war nicht erfolgreich - UI nicht ändern
              const errorMessage =
                error instanceof Error ? error.message : 'Unbekannter Verifikationsfehler';
              alert(
                `❌ Zahlungsverifikation fehlgeschlagen:\n\n${errorMessage}\n\nBitte überprüfen Sie Ihren Account oder kontaktieren Sie den Support.`
              );

              // Modal schließen aber keine Daten aktualisieren
              setShowInlinePayment(false);
              setPaymentClientSecret(null);
              setPaymentAmount(0);
              setPaymentHours(0);
            }
          }}
          onError={error => {
            console.error('Payment error:', error);

            // Bessere Kategorisierung von Zahlungsfehlern
            let errorCategory = 'Unbekannter Fehler';
            let userMessage = '';

            if (error.includes('canceled') || error.includes('cancelled')) {
              errorCategory = 'Zahlung abgebrochen';
              userMessage =
                'Die Zahlung wurde vom Benutzer abgebrochen. Sie können es jederzeit erneut versuchen.';
            } else if (error.includes('insufficient_funds')) {
              errorCategory = 'Unzureichende Mittel';
              userMessage =
                'Nicht genügend Guthaben auf der Karte. Bitte verwenden Sie eine andere Zahlungsmethode.';
            } else if (error.includes('card_declined')) {
              errorCategory = 'Karte abgelehnt';
              userMessage =
                'Die Karte wurde abgelehnt. Bitte überprüfen Sie Ihre Kartendetails oder verwenden Sie eine andere Karte.';
            } else if (error.includes('authentication_required')) {
              errorCategory = '3D Secure erforderlich';
              userMessage =
                'Zusätzliche Authentifizierung ist erforderlich. Bitte befolgen Sie die Anweisungen Ihrer Bank.';
            } else {
              userMessage = error;
            }

            console.log(`❌ Payment failed - Category: ${errorCategory}, Message: ${userMessage}`);

            alert(
              `❌ ${errorCategory}:\n\n${userMessage}\n\nDie Stunden bleiben zur Zahlung verfügbar.`
            );

            // Bei Fehler: Modal schließen aber Zahlungsdaten behalten für erneuten Versuch
            // Zahlung ist fehlgeschlagen - Stunden sind weiterhin unbezahlt
          }}
        />
      )}
    </div>
  );
}
