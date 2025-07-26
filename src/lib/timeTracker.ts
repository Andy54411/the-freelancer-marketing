// /Users/andystaudinger/Tasko/src/lib/timeTracker.ts

import {
  collection,
  doc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import {
  TimeEntry,
  OrderTimeTracking,
  CustomerApprovalRequest,
  TimeTrackingStats,
  AuftragWithTimeTracking,
} from '@/types/timeTracking';

export class TimeTracker {
  /**
   * Startet Time Tracking für einen aktiven Auftrag (integriert in Auftrag)
   */
  static async initializeOrderTimeTracking(
    orderId: string,
    originalPlannedHours: number,
    hourlyRate: number
  ): Promise<void> {
    try {
      const orderTimeTracking: OrderTimeTracking = {
        isActive: true,
        originalPlannedHours,
        totalLoggedHours: 0,
        totalApprovedHours: 0,
        totalBilledHours: 0,
        hourlyRate: hourlyRate * 100, // Convert to cents
        timeEntries: [],
        status: 'active',
        lastUpdated: serverTimestamp() as Timestamp,
        inititalizedAt: serverTimestamp() as Timestamp,
      };

      // Aktualisiere den Auftrag mit TimeTracking
      await updateDoc(doc(db, 'auftraege', orderId), {
        timeTracking: orderTimeTracking,
        approvalRequests: [],
      });

      console.log('[TimeTracker] Initialized time tracking for order:', orderId);
    } catch (error) {
      console.error('[TimeTracker] Error initializing time tracking:', error);
      throw error;
    }
  }

  /**
   * Neue Zeiteintragung hinzufügen
   */
  static async logTimeEntry(
    orderId: string,
    entry: {
      date: string;
      startTime: string;
      endTime?: string;
      hours: number;
      description: string;
      category: 'original' | 'additional';
      isBreakTime?: boolean;
      breakMinutes?: number;
      notes?: string;
    }
  ): Promise<string> {
    try {
      // Hole den Auftrag
      const orderRef = doc(db, 'auftraege', orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        throw new Error('Order not found');
      }

      const orderData = orderDoc.data() as AuftragWithTimeTracking;

      // Auto-initialisiere TimeTracking falls nicht vorhanden
      if (!orderData.timeTracking) {
        console.log('[TimeTracker] Auto-initializing time tracking for order:', orderId);

        // Verwende korrekte Werte aus Live-Daten
        const totalPrice =
          orderData.jobCalculatedPriceInCents || orderData.originalJobPriceInCents || 98400;

        // KORREKTUR: Verwende echte Auftragsdaten statt hardcodierte Werte
        let originalPlannedHours = orderData.jobTotalCalculatedHours || 8; // Default fallback

        // Berechne Stunden aus Datum-Range falls mehrtägig
        if (
          orderData.jobDateFrom &&
          orderData.jobDateTo &&
          orderData.jobDateFrom !== orderData.jobDateTo
        ) {
          const startDate = new Date(orderData.jobDateFrom);
          const endDate = new Date(orderData.jobDateTo);
          const totalDays =
            Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          const hoursPerDay = parseFloat(String(orderData.jobDurationString || 8)); // Stunden pro Tag aus jobDurationString
          originalPlannedHours = totalDays * hoursPerDay;

          console.log(
            `[TimeTracker] Mehrtägiger Auftrag: ${totalDays} Tage × ${hoursPerDay}h = ${originalPlannedHours}h`
          );
        } else {
          console.log(`[TimeTracker] Eintägiger Auftrag: ${originalPlannedHours}h`);
        }

        const hourlyRateInEuros = totalPrice / 100 / originalPlannedHours; // Korrekte Berechnung

        const orderTimeTracking: OrderTimeTracking = {
          isActive: true,
          originalPlannedHours: originalPlannedHours, // Verwende korrekte Variable
          totalLoggedHours: 0,
          totalApprovedHours: 0,
          totalBilledHours: 0,
          hourlyRate: Math.round(hourlyRateInEuros * 100), // Convert to cents, z.B. 4100 cents = 41€
          timeEntries: [],
          status: 'active',
          lastUpdated: serverTimestamp() as Timestamp,
          inititalizedAt: serverTimestamp() as Timestamp,
        };

        // Aktualisiere den Auftrag mit TimeTracking
        await updateDoc(orderRef, {
          timeTracking: orderTimeTracking,
          approvalRequests: [],
        });

        // Update lokale Daten
        orderData.timeTracking = orderTimeTracking;
        orderData.approvalRequests = [];
      }

      // Erstelle neue TimeEntry
      const entryId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const timeEntry: TimeEntry = {
        id: entryId,
        ...entry,
        status: 'logged',
        createdAt: Timestamp.now(), // serverTimestamp() nicht in Arrays erlaubt
      };

      // Berechne billableAmount für zusätzliche Stunden
      if (entry.category === 'additional') {
        timeEntry.billableAmount = Math.round(entry.hours * orderData.timeTracking.hourlyRate);
      }

      // Füge Entry zu timeEntries Array hinzu
      const updatedTimeEntries = [...orderData.timeTracking.timeEntries, timeEntry];

      // Berechne neue Statistiken
      const totalLoggedHours = updatedTimeEntries.reduce((sum, e) => sum + e.hours, 0);

      // Update den Auftrag
      await updateDoc(orderRef, {
        'timeTracking.timeEntries': updatedTimeEntries,
        'timeTracking.totalLoggedHours': totalLoggedHours,
        'timeTracking.lastUpdated': serverTimestamp(),
      });

      console.log('[TimeTracker] Time entry logged:', entryId);
      return entryId;
    } catch (error) {
      console.error('[TimeTracker] Error logging time entry:', error);
      throw error;
    }
  }

  /**
   * Zeiteintragung löschen
   */
  static async deleteTimeEntry(orderId: string, entryId: string): Promise<void> {
    try {
      // Hole den Auftrag
      const orderRef = doc(db, 'auftraege', orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        throw new Error('Order not found');
      }

      const orderData = orderDoc.data() as AuftragWithTimeTracking;

      if (!orderData.timeTracking) {
        throw new Error('Time tracking not found');
      }

      // Finde die Entry
      const entryIndex = orderData.timeTracking.timeEntries.findIndex(e => e.id === entryId);
      if (entryIndex === -1) {
        throw new Error('Time entry not found');
      }

      const entry = orderData.timeTracking.timeEntries[entryIndex];

      // Nur löschbar wenn noch nicht submitted
      if (entry.status !== 'logged') {
        throw new Error('Cannot delete submitted time entries');
      }

      // Entferne Entry aus dem Array
      const updatedTimeEntries = orderData.timeTracking.timeEntries.filter(e => e.id !== entryId);

      // Berechne neue Statistiken
      const totalLoggedHours = updatedTimeEntries.reduce((sum, e) => sum + e.hours, 0);

      // Update den Auftrag
      await updateDoc(orderRef, {
        'timeTracking.timeEntries': updatedTimeEntries,
        'timeTracking.totalLoggedHours': totalLoggedHours,
        'timeTracking.lastUpdated': serverTimestamp(),
      });

      console.log('[TimeTracker] Time entry deleted:', entryId);
    } catch (error) {
      console.error('[TimeTracker] Error deleting time entry:', error);
      throw error;
    }
  }

  /**
   * Alle Zeiteinträge für einen Auftrag abrufen
   */
  static async getTimeEntriesForOrder(orderId: string): Promise<TimeEntry[]> {
    try {
      // Hole den Auftrag
      const orderRef = doc(db, 'auftraege', orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        throw new Error('Order not found');
      }

      const orderData = orderDoc.data() as AuftragWithTimeTracking;

      if (!orderData.timeTracking) {
        return []; // Kein TimeTracking initialisiert
      }

      // Sortiere Entries nach Datum (neueste zuerst)
      const sortedEntries = [...orderData.timeTracking.timeEntries].sort((a, b) => {
        if (a.date !== b.date) {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        return b.startTime.localeCompare(a.startTime);
      });

      return sortedEntries;
    } catch (error) {
      console.error('[TimeTracker] Error getting time entries:', error);
      throw error;
    }
  }

  /**
   * Zeiteinträge zur Kundenfreigabe einreichen (integriert in Auftrag)
   */
  static async submitForCustomerApproval(
    orderId: string,
    entryIds: string[],
    providerMessage?: string
  ): Promise<string> {
    try {
      // Hole den Auftrag
      const orderRef = doc(db, 'auftraege', orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        throw new Error('Order not found');
      }

      const orderData = orderDoc.data() as AuftragWithTimeTracking;

      if (!orderData.timeTracking) {
        throw new Error('Time tracking not found');
      }

      // Hole die angegebenen Entries
      const entries = orderData.timeTracking.timeEntries.filter(e => entryIds.includes(e.id));

      if (entries.length === 0) {
        throw new Error('No valid time entries found');
      }

      const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);

      // Berechne Gesamtbetrag (nur zusätzliche Stunden)
      const additionalEntries = entries.filter(entry => entry.category === 'additional');
      const totalAmount = additionalEntries.reduce(
        (sum, entry) => sum + (entry.billableAmount || 0),
        0
      );

      // Erstelle Approval Request
      const approvalRequestId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const approvalRequest: CustomerApprovalRequest = {
        id: approvalRequestId,
        timeEntryIds: entryIds,
        totalHours,
        totalAmount,
        submittedAt: Timestamp.now(), // serverTimestamp() nicht in Arrays erlaubt
        status: 'pending',
        providerMessage,
      };

      // Aktualisiere Entries auf "submitted" und füge Approval Request hinzu
      const updatedTimeEntries = orderData.timeTracking.timeEntries.map(entry => {
        if (entryIds.includes(entry.id)) {
          return {
            ...entry,
            status: 'submitted' as const,
            submittedAt: Timestamp.now(), // serverTimestamp() nicht in Arrays erlaubt
          };
        }
        return entry;
      });

      const updatedApprovalRequests = [...(orderData.approvalRequests || []), approvalRequest];

      // Update den Auftrag
      await updateDoc(orderRef, {
        'timeTracking.timeEntries': updatedTimeEntries,
        'timeTracking.status': 'submitted_for_approval',
        'timeTracking.lastUpdated': serverTimestamp(),
        approvalRequests: updatedApprovalRequests,
      });

      console.log('[TimeTracker] Submitted for customer approval:', approvalRequestId);
      return approvalRequestId;
    } catch (error) {
      console.error('[TimeTracker] Error submitting for approval:', error);
      throw error;
    }
  }

  /**
   * Kunde genehmigt den kompletten Auftrag ab (alle Stunden und beendet den Auftrag)
   */
  static async approveCompleteOrder(orderId: string, customerFeedback?: string): Promise<void> {
    try {
      // Hole den Auftrag
      const orderRef = doc(db, 'auftraege', orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        throw new Error('Order not found');
      }

      const orderData = orderDoc.data() as AuftragWithTimeTracking;

      if (!orderData.timeTracking || !orderData.approvalRequests) {
        throw new Error('Time tracking or approval requests not found');
      }

      // Genehmige ALLE ausstehenden Approval Requests
      const updatedApprovalRequests = orderData.approvalRequests.map(req => {
        if (req.status === 'pending') {
          return {
            ...req,
            status: 'approved' as const,
            customerFeedback: customerFeedback || 'Kompletter Auftrag freigegeben',
            customerResponseAt: Timestamp.now(),
          };
        }
        return req;
      });

      // Genehmige ALLE TimeEntries die submitted sind
      const updatedTimeEntries = orderData.timeTracking.timeEntries.map(entry => {
        if (entry.status === 'submitted') {
          return {
            ...entry,
            status: 'customer_approved' as const,
            customerResponseAt: Timestamp.now(),
          };
        }
        return entry;
      });

      // Berechne neue Statistiken
      const totalApprovedHours = updatedTimeEntries
        .filter(entry => entry.status === 'customer_approved' || entry.status === 'billed')
        .reduce((sum, entry) => sum + entry.hours, 0);

      // Update den Auftrag - setze Status auf ABGESCHLOSSEN
      await updateDoc(orderRef, {
        'timeTracking.timeEntries': updatedTimeEntries,
        'timeTracking.totalApprovedHours': totalApprovedHours,
        'timeTracking.status': 'completed',
        'timeTracking.customerFeedback': customerFeedback || 'Kompletter Auftrag freigegeben',
        'timeTracking.lastUpdated': serverTimestamp(),
        approvalRequests: updatedApprovalRequests,
        // WICHTIG: Setze den Hauptauftragsstatus auf ABGESCHLOSSEN
        status: 'ABGESCHLOSSEN',
        completedAt: serverTimestamp(),
      });

      console.log('[TimeTracker] Complete order approval processed:', orderId);
    } catch (error) {
      console.error('[TimeTracker] Error processing complete order approval:', error);
      throw error;
    }
  }

  /**
   * Kunde genehmigt/lehnt Zeiteinträge ab (integriert in Auftrag)
   */
  static async processCustomerApproval(
    orderId: string,
    approvalRequestId: string,
    decision: 'approved' | 'rejected' | 'partially_approved',
    approvedEntryIds?: string[],
    customerFeedback?: string | null
  ): Promise<void> {
    try {
      // Hole den Auftrag
      const orderRef = doc(db, 'auftraege', orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        throw new Error('Order not found');
      }

      const orderData = orderDoc.data() as AuftragWithTimeTracking;

      if (!orderData.timeTracking || !orderData.approvalRequests) {
        throw new Error('Time tracking or approval requests not found');
      }

      // Finde die Approval Request
      const approvalIndex = orderData.approvalRequests.findIndex(
        req => req.id === approvalRequestId
      );
      if (approvalIndex === -1) {
        throw new Error('Approval request not found');
      }

      const approvalRequest = orderData.approvalRequests[approvalIndex];

      // Aktualisiere Approval Request
      const updatedApprovalRequests = [...orderData.approvalRequests];
      updatedApprovalRequests[approvalIndex] = {
        ...approvalRequest,
        status: decision,
        customerFeedback: customerFeedback || null, // undefined → null für Firestore
        customerResponseAt: Timestamp.now(), // serverTimestamp() nicht in Arrays erlaubt
        approvedEntryIds: decision === 'partially_approved' ? approvedEntryIds || [] : [],
      };

      // Aktualisiere Time Entries basierend auf Entscheidung
      const updatedTimeEntries = orderData.timeTracking.timeEntries.map(entry => {
        if (!approvalRequest.timeEntryIds.includes(entry.id)) {
          return entry; // Entry nicht Teil dieser Approval Request
        }

        let newStatus: TimeEntry['status'];

        if (decision === 'approved') {
          newStatus = 'customer_approved';
        } else if (decision === 'rejected') {
          newStatus = 'customer_rejected';
        } else {
          // partially_approved
          newStatus = approvedEntryIds?.includes(entry.id)
            ? 'customer_approved'
            : 'customer_rejected';
        }

        return {
          ...entry,
          status: newStatus,
          customerResponseAt: Timestamp.now(), // serverTimestamp() nicht in Arrays erlaubt
        };
      });

      // Berechne neue Statistiken
      const totalApprovedHours = updatedTimeEntries
        .filter(entry => entry.status === 'customer_approved' || entry.status === 'billed')
        .reduce((sum, entry) => sum + entry.hours, 0);

      // Bestimme neuen TimeTracking Status
      let newTimeTrackingStatus: OrderTimeTracking['status'] = 'active';
      if (decision === 'approved') {
        newTimeTrackingStatus = 'fully_approved';
      } else if (decision === 'partially_approved') {
        newTimeTrackingStatus = 'partially_approved';
      }

      // Update den Auftrag - filtere undefined Werte raus
      const updateData: any = {
        'timeTracking.timeEntries': updatedTimeEntries,
        'timeTracking.totalApprovedHours': totalApprovedHours,
        'timeTracking.status': newTimeTrackingStatus,
        'timeTracking.lastUpdated': serverTimestamp(),
        approvalRequests: updatedApprovalRequests,
      };

      // Füge customerFeedback nur hinzu wenn es einen Wert hat
      if (
        customerFeedback !== undefined &&
        customerFeedback !== null &&
        customerFeedback.trim() !== ''
      ) {
        updateData['timeTracking.customerFeedback'] = customerFeedback;
      }

      await updateDoc(orderRef, updateData);

      console.log('[TimeTracker] Customer approval processed:', approvalRequestId);
    } catch (error) {
      console.error('[TimeTracker] Error processing customer approval:', error);
      throw error;
    }
  } /**
   * Genehmigte Stunden in Stripe abrechnen (integriert in Auftrag)
   */
  static async billApprovedHours(orderId: string): Promise<{
    paymentIntentId: string;
    customerPays: number;
    companyReceives: number;
    platformFee: number;
    clientSecret: string;
  }> {
    try {
      // Hole den Auftrag
      const orderRef = doc(db, 'auftraege', orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        throw new Error('Order not found');
      }

      const orderData = orderDoc.data() as AuftragWithTimeTracking;

      if (!orderData.timeTracking) {
        throw new Error('Time tracking not found');
      }

      // Hole genehmigte zusätzliche Stunden
      const approvedEntries = orderData.timeTracking.timeEntries.filter(
        entry => entry.category === 'additional' && entry.status === 'customer_approved'
      );

      if (approvedEntries.length === 0) {
        throw new Error('No approved additional hours to bill');
      }

      const totalAmount = approvedEntries.reduce(
        (sum, entry) => sum + (entry.billableAmount || 0),
        0
      );

      if (totalAmount <= 0) {
        throw new Error('No billable amount found');
      }

      // Hole Kundendaten für Stripe Customer ID
      const customerDoc = await getDoc(doc(db, 'users', orderData.customerFirebaseUid));
      const customerData = customerDoc.data();
      const customerStripeId = customerData?.stripeCustomerId;

      if (!customerStripeId) {
        throw new Error('Customer Stripe ID not found');
      }

      // Hole Anbieter Stripe Account ID
      const providerDoc = await getDoc(doc(db, 'companies', orderData.selectedAnbieterId));
      const providerData = providerDoc.data();
      const providerStripeAccountId = providerData?.stripeConnectAccountId;

      if (!providerStripeAccountId) {
        throw new Error('Provider Stripe Account ID not found');
      }

      console.log('[TimeTracker] Creating Stripe PaymentIntent for additional hours:', {
        orderId,
        totalAmount,
        customerStripeId,
        providerStripeAccountId,
        approvedEntriesCount: approvedEntries.length,
      });

      // Erstelle PaymentIntent über unsere API
      const response = await fetch('/api/bill-additional-hours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          approvedEntryIds: approvedEntries.map(e => e.id),
          customerStripeId,
          providerStripeAccountId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create PaymentIntent');
      }

      const paymentData = await response.json();

      // Markiere Einträge als abgerechnet (vorläufig)
      const updatedTimeEntries = orderData.timeTracking.timeEntries.map(entry => {
        if (entry.category === 'additional' && entry.status === 'customer_approved') {
          return {
            ...entry,
            status: 'billing_pending' as const,
            paymentIntentId: paymentData.paymentIntentId,
            billingInitiatedAt: Timestamp.now(),
          };
        }
        return entry;
      });

      // Berechne neue Statistiken
      const totalBilledHours = updatedTimeEntries
        .filter(entry => entry.status === 'billed' || entry.status === 'billing_pending')
        .reduce((sum, entry) => sum + entry.hours, 0);

      // Update den Auftrag
      await updateDoc(orderRef, {
        'timeTracking.timeEntries': updatedTimeEntries,
        'timeTracking.totalBilledHours': totalBilledHours,
        'timeTracking.status': 'billing_pending',
        'timeTracking.lastUpdated': serverTimestamp(),
        'timeTracking.billingData': {
          paymentIntentId: paymentData.paymentIntentId,
          customerPays: paymentData.customerPays,
          companyReceives: paymentData.companyReceives,
          platformFee: paymentData.platformFee,
          initiatedAt: serverTimestamp(),
          status: 'pending',
        },
      });

      console.log('[TimeTracker] PaymentIntent created successfully:', {
        paymentIntentId: paymentData.paymentIntentId,
        customerPays: paymentData.customerPays,
        companyReceives: paymentData.companyReceives,
        platformFee: paymentData.platformFee,
        clientSecret: paymentData.clientSecret,
      });

      return {
        paymentIntentId: paymentData.paymentIntentId,
        customerPays: paymentData.customerPays,
        companyReceives: paymentData.companyReceives,
        platformFee: paymentData.platformFee,
        clientSecret: paymentData.clientSecret,
      };
    } catch (error) {
      console.error('[TimeTracker] Error billing approved hours:', error);
      throw error;
    }
  }

  /**
   * Statistiken für Provider abrufen (integriert in Auftrag)
   */
  static async getProviderTimeTrackingStats(providerId: string): Promise<TimeTrackingStats> {
    try {
      // Hole alle aktiven Aufträge für Provider
      const ordersQuery = query(
        collection(db, 'auftraege'),
        where('selectedAnbieterId', '==', providerId),
        where('status', 'in', ['AKTIV', 'completed'])
      );

      const ordersSnapshot = await getDocs(ordersQuery);

      let totalActiveOrders = 0;
      let totalLoggedHours = 0;
      let totalPendingApproval = 0;
      let totalApprovedHours = 0;
      let pendingPayoutAmount = 0;

      // Analysiere jedes Auftrag mit TimeTracking
      for (const orderDoc of ordersSnapshot.docs) {
        const orderData = orderDoc.data() as AuftragWithTimeTracking;

        if (orderData.timeTracking && orderData.timeTracking.isActive) {
          const tracking = orderData.timeTracking;

          if (tracking.status === 'active' || tracking.status === 'submitted_for_approval') {
            totalActiveOrders++;
          }

          totalLoggedHours += tracking.totalLoggedHours;
          totalApprovedHours += tracking.totalApprovedHours;

          if (tracking.status === 'submitted_for_approval') {
            totalPendingApproval += tracking.totalLoggedHours;
          }

          // Berechne ausstehende Auszahlungen (genehmigte aber noch nicht abgerechnete Stunden)
          const approvedAdditionalEntries = tracking.timeEntries.filter(
            entry => entry.status === 'customer_approved' && entry.category === 'additional'
          );

          for (const entry of approvedAdditionalEntries) {
            pendingPayoutAmount += entry.billableAmount || 0;
          }
        }
      }

      const averageHoursPerOrder = totalActiveOrders > 0 ? totalLoggedHours / totalActiveOrders : 0;

      const stats: TimeTrackingStats = {
        totalActiveOrders,
        totalLoggedHours,
        totalPendingApproval,
        totalApprovedHours,
        pendingPayoutAmount,
        averageHoursPerOrder: Math.round(averageHoursPerOrder * 100) / 100,
        lastUpdated: serverTimestamp() as Timestamp,
      };

      return stats;
    } catch (error) {
      console.error('[TimeTracker] Error getting provider stats:', error);
      throw error;
    }
  }

  /**
   * Formatiert Stunden für Anzeige
   */
  static formatHours(hours: number): string {
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes} Min`;
    }
    return `${hours.toFixed(1)} Std`;
  }

  /**
   * Holt alle ausstehenden Approval Requests für einen Kunden (integriert in Auftrag)
   */
  static async getPendingApprovalRequests(customerId: string): Promise<CustomerApprovalRequest[]> {
    try {
      // Hole alle Aufträge des Kunden
      const ordersQuery = query(
        collection(db, 'auftraege'),
        where('customerFirebaseUid', '==', customerId)
      );

      const ordersSnapshot = await getDocs(ordersQuery);
      const requests: CustomerApprovalRequest[] = [];

      for (const orderDoc of ordersSnapshot.docs) {
        const orderData = orderDoc.data() as AuftragWithTimeTracking;

        if (orderData.approvalRequests) {
          for (const approvalRequest of orderData.approvalRequests) {
            if (approvalRequest.status === 'pending') {
              // Hole die entsprechenden TimeEntries
              const timeEntries: TimeEntry[] = [];
              if (orderData.timeTracking) {
                for (const entryId of approvalRequest.timeEntryIds) {
                  const entry = orderData.timeTracking.timeEntries.find(e => e.id === entryId);
                  if (entry) {
                    timeEntries.push(entry);
                  }
                }
              }

              requests.push({
                ...approvalRequest,
                // Temporär für Kompatibilität - sollte entfernt werden
                timeEntries,
              } as any);
            }
          }
        }
      }

      return requests;
    } catch (error) {
      console.error('Error fetching pending approval requests:', error);
      throw error;
    }
  }

  /**
   * Holt Order-Details für eine Auftrags-ID
   */
  static async getOrderDetails(orderId: string): Promise<any> {
    try {
      const orderDoc = await getDoc(doc(db, 'auftraege', orderId));

      if (orderDoc.exists()) {
        const data = orderDoc.data();
        const result = { id: orderDoc.id, ...data };
        return result;
      }
      return null;
    } catch (error) {
      console.error('Error fetching order details:', error);
      throw error;
    }
  } /**
   * Verarbeitet Kundenfreigabe (Instance-Methode)
   */
  async processCustomerApproval(
    orderId: string,
    approvalRequestId: string,
    decision: 'approved' | 'rejected' | 'partially_approved',
    approvedEntryIds?: string[],
    customerFeedback?: string
  ): Promise<void> {
    return TimeTracker.processCustomerApproval(
      orderId,
      approvalRequestId,
      decision,
      approvedEntryIds,
      customerFeedback
    );
  }

  /**
   * Holt ausstehende Approval Requests (Instance-Methode)
   */
  async getPendingApprovalRequests(customerId: string): Promise<CustomerApprovalRequest[]> {
    return TimeTracker.getPendingApprovalRequests(customerId);
  }

  /**
   * Holt Order-Details (Instance-Methode)
   */
  async getOrderDetails(orderId: string): Promise<any> {
    return TimeTracker.getOrderDetails(orderId);
  }

  /**
   * Zeiteintragung bearbeiten (integriert in Auftrag)
   */
  static async updateTimeEntry(
    orderId: string,
    entryId: string,
    updates: Partial<TimeEntry>
  ): Promise<void> {
    try {
      // Hole den Auftrag
      const orderRef = doc(db, 'auftraege', orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        throw new Error('Order not found');
      }

      const orderData = orderDoc.data() as AuftragWithTimeTracking;

      if (!orderData.timeTracking) {
        throw new Error('Time tracking not found');
      }

      // Finde die Entry
      const entryIndex = orderData.timeTracking.timeEntries.findIndex(e => e.id === entryId);
      if (entryIndex === -1) {
        throw new Error('Time entry not found');
      }

      const entry = orderData.timeTracking.timeEntries[entryIndex];

      // Nur bearbeitbar wenn noch nicht submitted
      if (entry.status !== 'logged') {
        throw new Error('Cannot edit submitted time entries');
      }

      // Update die Entry
      const updatedTimeEntries = [...orderData.timeTracking.timeEntries];
      updatedTimeEntries[entryIndex] = {
        ...entry,
        ...updates,
        id: entryId, // ID darf nicht geändert werden
      };

      // Berechne neue Statistiken
      const totalLoggedHours = updatedTimeEntries.reduce((sum, e) => sum + e.hours, 0);

      // Update den Auftrag
      await updateDoc(orderRef, {
        'timeTracking.timeEntries': updatedTimeEntries,
        'timeTracking.totalLoggedHours': totalLoggedHours,
        'timeTracking.lastUpdated': serverTimestamp(),
      });

      console.log('[TimeTracker] Time entry updated:', entryId);
    } catch (error) {
      console.error('[TimeTracker] Error updating time entry:', error);
      throw error;
    }
  }

  /**
   * Berechnet Stunden aus Start- und Endzeit
   */
  static calculateHoursFromTime(
    startTime: string,
    endTime: string,
    breakMinutes: number = 0
  ): number {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    let workingMinutes = endTotalMinutes - startTotalMinutes;

    // Handle overnight work
    if (workingMinutes < 0) {
      workingMinutes += 24 * 60;
    }

    // Subtract break time
    workingMinutes -= breakMinutes;

    return Math.max(0, workingMinutes / 60);
  }
}
