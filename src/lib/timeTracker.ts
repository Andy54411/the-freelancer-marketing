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

    } catch (error) {

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
      travelTime?: boolean;
      travelMinutes?: number;
      travelCost?: number; // Anfahrtskosten in Cents
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

      // KORREKTUR: Hole IMMER den aktuellen Firmen-Stundensatz (ZUERST companies, DANN users als Fallback)
      const providerId = orderData.selectedAnbieterId;
      let hourlyRateInEuros: number | null = null; // Zunächst null

      if (providerId) {
        // 1. Versuche zuerst companies Collection
        const companyRef = doc(db, 'companies', providerId);
        const companyDoc = await getDoc(companyRef);

        if (companyDoc.exists()) {
          const companyData = companyDoc.data();
          if (companyData.hourlyRate && companyData.hourlyRate > 0) {
            hourlyRateInEuros = companyData.hourlyRate;

          }
        }

        // 2. Fallback: Suche in users Collection (nur wenn nicht in companies gefunden)
        if (hourlyRateInEuros === null) {
          const userRef = doc(db, 'users', providerId);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.hourlyRate && userData.hourlyRate > 0) {
              hourlyRateInEuros = userData.hourlyRate;

            }
          }
        }
      }

      // 3. LETZTER FALLBACK: Manueller Input per Popup
      if (hourlyRateInEuros === null) {

        const userInput = prompt(
          `⚠️ STUNDENSATZ ERFORDERLICH\n\n` +
          `Für diesen Anbieter wurde kein Stundensatz gefunden.\n` +
          `Bitte geben Sie den Stundensatz ein (in €/h):\n\n` +
          `Beispiel: 41 (für 41€/h)`,
          '41'
        );

        if (userInput && !isNaN(parseFloat(userInput))) {
          hourlyRateInEuros = parseFloat(userInput);

          // Optional: Speichere den Stundensatz in der users Collection für zukünftige Verwendung
          if (providerId) {
            try {
              await updateDoc(doc(db, 'users', providerId), {
                hourlyRate: hourlyRateInEuros,
                hourlyRateUpdatedAt: serverTimestamp(),
                hourlyRateUpdatedBy: 'manual_input',
              });

            } catch (error) {

            }
          }
        } else {
          throw new Error(
            'Stundensatz-Eingabe abgebrochen oder ungültig. Zeiterfassung kann nicht fortgesetzt werden.'
          );
        }
      }

      // Auto-initialisiere TimeTracking falls nicht vorhanden
      if (!orderData.timeTracking) {

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

        } else {

        }

        // hourlyRateInEuros ist bereits oben geholt worden

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
        // KORREKTUR: Verwende den Firmen-Stundensatz, nicht den gespeicherten falschen Wert
        const correctHourlyRateInCents = Math.round(hourlyRateInEuros * 100); // Verwende den geholtenen Firmen-Stundensatz

        // Debug: Log zur Überprüfung

        // Berechne billableAmount: Stunden × Stundensatz + Anfahrtskosten
        const hoursAmount = Math.round(entry.hours * correctHourlyRateInCents);
        const travelCostAmount = entry.travelCost || 0;
        timeEntry.billableAmount = hoursAmount + travelCostAmount;
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

      return entryId;
    } catch (error) {

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

    } catch (error) {

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

      return approvalRequestId;
    } catch (error) {

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

    } catch (error) {

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

    } catch (error) {

      throw error;
    }
  }

  /**
   * ESCROW-SYSTEM: Genehmigte Stunden in Escrow autorisieren (Geld halten, nicht auszahlen)
   */
  static async authorizeAdditionalHoursEscrow(orderId: string): Promise<{
    paymentIntentId: string;
    customerPays: number;
    companyReceives: number;
    platformFee: number;
    clientSecret: string;
    escrowStatus: string;
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

      // Hole genehmigte zusätzliche Stunden die noch nicht in Escrow sind
      const approvedEntries = orderData.timeTracking.timeEntries.filter(
        entry =>
          entry.category === 'additional' &&
          entry.status === 'customer_approved' &&
          entry.escrowStatus !== 'authorized' &&
          entry.escrowStatus !== 'released'
      );

      if (approvedEntries.length === 0) {
        throw new Error('No approved additional hours available for escrow authorization');
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
        throw new Error('Provider Stripe Connect Account ID not found');
      }

      // Erstelle Platform Hold PaymentIntent über unsere API
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
        throw new Error(errorData.error || 'Failed to create Platform Hold PaymentIntent');
      }

      const paymentData = await response.json();

      // Erstelle PlatformHoldPaymentIntent Eintrag
      const platformHoldPaymentIntent = {
        id: paymentData.paymentIntentId,
        amount: paymentData.customerPays,
        companyAmount: paymentData.companyReceives,
        platformFee: paymentData.platformFee,
        entryIds: approvedEntries.map(e => e.id),
        heldAt: Timestamp.now(),
        status: 'held' as const,
        clientSecret: paymentData.clientSecret,
      };

      // Markiere Einträge als platform-hold
      const updatedTimeEntries = orderData.timeTracking.timeEntries.map(entry => {
        if (
          entry.category === 'additional' &&
          entry.status === 'customer_approved' &&
          approvedEntries.some(e => e.id === entry.id)
        ) {
          return {
            ...entry,
            status: 'platform_held' as const,
            platformHoldPaymentIntentId: paymentData.paymentIntentId,
            platformHoldAt: Timestamp.now(),
            platformHoldStatus: 'held' as const,
          };
        }
        return entry;
      });

      // Update den Auftrag mit Platform Hold-Daten (ohne platformHoldPaymentIntents für jetzt)
      await updateDoc(orderRef, {
        'timeTracking.timeEntries': updatedTimeEntries,
        'timeTracking.status': 'platform_hold_pending',
        'timeTracking.lastUpdated': serverTimestamp(),
      });

      return {
        paymentIntentId: paymentData.paymentIntentId,
        customerPays: paymentData.customerPays,
        companyReceives: paymentData.companyReceives,
        platformFee: paymentData.platformFee,
        clientSecret: paymentData.clientSecret,
        escrowStatus: 'authorized', // Legacy compatibility
      };
    } catch (error) {

      throw error;
    }
  }

  /**
   * Projektabnahme durch Kunde markieren
   */
  static async markProjectCompleteByCustomer(
    orderId: string,
    customerMessage?: string
  ): Promise<void> {
    try {
      const orderRef = doc(db, 'auftraege', orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        throw new Error('Order not found');
      }

      const orderData = orderDoc.data() as AuftragWithTimeTracking;

      if (!orderData.timeTracking) {
        throw new Error('Time tracking not found');
      }

      const currentCompletion = orderData.timeTracking.projectCompletionStatus || {
        customerMarkedComplete: false,
        providerMarkedComplete: false,
        bothPartiesComplete: false,
        escrowReleaseInitiated: false,
      };

      const updatedCompletion = {
        ...currentCompletion,
        customerMarkedComplete: true,
        customerCompletedAt: serverTimestamp(),
        bothPartiesComplete: currentCompletion.providerMarkedComplete && true,
        finalCompletionAt: currentCompletion.providerMarkedComplete
          ? serverTimestamp()
          : currentCompletion.finalCompletionAt,
      };

      await updateDoc(orderRef, {
        'timeTracking.projectCompletionStatus': updatedCompletion,
        'timeTracking.lastUpdated': serverTimestamp(),
      });

      // Wenn beide Parteien bestätigt haben, initiere Platform Fund Release
      if (updatedCompletion.bothPartiesComplete && !updatedCompletion.escrowReleaseInitiated) {
        await this.releasePlatformFunds(orderId);
      }

    } catch (error) {

      throw error;
    }
  }

  /**
   * Projektabnahme durch Anbieter markieren
   */
  static async markProjectCompleteByProvider(
    orderId: string,
    providerMessage?: string
  ): Promise<void> {
    try {
      const orderRef = doc(db, 'auftraege', orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        throw new Error('Order not found');
      }

      const orderData = orderDoc.data() as AuftragWithTimeTracking;

      if (!orderData.timeTracking) {
        throw new Error('Time tracking not found');
      }

      const currentCompletion = orderData.timeTracking.projectCompletionStatus || {
        customerMarkedComplete: false,
        providerMarkedComplete: false,
        bothPartiesComplete: false,
        escrowReleaseInitiated: false,
      };

      const updatedCompletion = {
        ...currentCompletion,
        providerMarkedComplete: true,
        providerCompletedAt: serverTimestamp(),
        bothPartiesComplete: currentCompletion.customerMarkedComplete && true,
        finalCompletionAt: currentCompletion.customerMarkedComplete
          ? serverTimestamp()
          : currentCompletion.finalCompletionAt,
      };

      await updateDoc(orderRef, {
        'timeTracking.projectCompletionStatus': updatedCompletion,
        'timeTracking.lastUpdated': serverTimestamp(),
      });

      // Wenn beide Parteien bestätigt haben, initiere Platform Fund Release
      if (updatedCompletion.bothPartiesComplete && !updatedCompletion.escrowReleaseInitiated) {
        await this.releasePlatformFunds(orderId);
      }

    } catch (error) {

      throw error;
    }
  }

  /**
   * Platform-Gelder freigeben (nach beidseitiger Projektabnahme)
   * Ersetzt die alte Escrow-Freigabe durch echte Platform-to-Provider Transfers
   */
  static async releasePlatformFunds(orderId: string): Promise<void> {
    try {
      const orderRef = doc(db, 'auftraege', orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        throw new Error('Order not found');
      }

      const orderData = orderDoc.data() as AuftragWithTimeTracking;

      if (!orderData.timeTracking) {
        throw new Error('Time tracking not found');
      }

      // Hole alle Platform Hold PaymentIntents aus TimeEntries
      const platformHoldPaymentIntents = orderData.timeTracking.timeEntries
        .filter(entry => entry.platformHoldStatus === 'held' && entry.platformHoldPaymentIntentId)
        .map(entry => entry.platformHoldPaymentIntentId)
        .filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates

      if (platformHoldPaymentIntents.length === 0) {

        return;
      }

      // Rufe Platform-Freigabe API auf
      const response = await fetch('/api/release-platform-funds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          paymentIntentIds: platformHoldPaymentIntents,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to release platform funds');
      }

      const releaseData = await response.json();

    } catch (error) {

      throw error;
    }
  }

  /**
   * Genehmigte Stunden in Stripe abrechnen (integriert in Auftrag) - LEGACY VERSION
   * Diese Methode wird durch das Escrow-System ersetzt, bleibt aber für Rückwärtskompatibilität
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

      // Hole genehmigte zusätzliche Stunden (customer_approved UND billing_pending)
      // billing_pending = bereits genehmigt aber Payment fehlgeschlagen/wiederholt
      const approvedEntries = orderData.timeTracking.timeEntries.filter(
        entry =>
          entry.category === 'additional' &&
          (entry.status === 'customer_approved' || entry.status === 'billing_pending')
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
        // Versuche auch in der users Collection zu suchen (Fallback für alte Daten)
        const providerUserDoc = await getDoc(doc(db, 'users', orderData.selectedAnbieterId));
        const providerUserData = providerUserDoc.data();
        const fallbackStripeAccountId = providerUserData?.stripeAccountId;

        // Falls Fallback verfügbar, verwende ihn
        if (fallbackStripeAccountId) {

          // Fortsetzung mit der gefundenen ID - Migration wird Server-seitig in der API behandelt
          const providerStripeAccountIdFallback = fallbackStripeAccountId;

          // Erstelle PaymentIntent über unsere API (mit Fallback ID)
          const response = await fetch('/api/bill-additional-hours', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              orderId,
              approvedEntryIds: approvedEntries.map(e => e.id),
              customerStripeId,
              providerStripeAccountId: providerStripeAccountIdFallback,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();

            // Spezielle Behandlung für Stripe Connect Probleme
            if (
              errorData.error?.includes('Stripe Connect') ||
              errorData.error?.includes('account')
            ) {

              throw new Error(
                `❌ PAYMENT SETUP ERFORDERLICH\n\n` +
                `Der Dienstleister muss seine Stripe Connect Einrichtung abschließen.\n` +
                `Bitte kontaktieren Sie den Support für weitere Hilfe.\n\n` +
                `Technische Details: ${errorData.error}`
              );
            }

            throw new Error(errorData.error || 'Failed to create PaymentIntent');
          }

          const paymentData = await response.json();

          // Markiere NEUE Einträge als billing_pending, aktualisiere BEREITS billing_pending Einträge
          const updatedTimeEntries = orderData.timeTracking.timeEntries.map(entry => {
            if (
              entry.category === 'additional' &&
              (entry.status === 'customer_approved' || entry.status === 'billing_pending')
            ) {
              return {
                ...entry,
                status: 'billing_pending' as const,
                paymentIntentId: paymentData.paymentIntentId,
                billingInitiatedAt:
                  entry.status === 'billing_pending' && 'billingInitiatedAt' in entry
                    ? entry.billingInitiatedAt
                    : Timestamp.now(),
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

          return {
            paymentIntentId: paymentData.paymentIntentId,
            customerPays: paymentData.customerPays,
            companyReceives: paymentData.companyReceives,
            platformFee: paymentData.platformFee,
            clientSecret: paymentData.clientSecret,
          };
        }

        throw new Error(
          `❌ STRIPE CONNECT SETUP ERFORDERLICH\n\n` +
          `Problem: Kein Stripe Connect Account für Provider gefunden.\n` +
          `Provider ID: ${orderData.selectedAnbieterId}\n\n` +
          `Lösungsschritte:\n` +
          `1. Provider muss Stripe Connect Onboarding abschließen\n` +
          `2. In companies/${orderData.selectedAnbieterId} sollte 'stripeConnectAccountId' vorhanden sein\n` +
          `3. Account muss Status 'active' haben\n\n` +
          `Für Details siehe Browser Console.`
        );
      }

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
        const errorText = await response.text();

        let errorData: any;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }

        // Spezielle Behandlung für Stripe Connect Probleme
        if (errorData.error?.includes('Stripe Connect') || errorData.error?.includes('account')) {

          throw new Error(
            `❌ PAYMENT SETUP ERFORDERLICH\n\n` +
            `Der Dienstleister muss seine Stripe Connect Einrichtung abschließen.\n` +
            `Bitte kontaktieren Sie den Support für weitere Hilfe.\n\n` +
            `Technische Details: ${errorData.error}`
          );
        }

        throw new Error(errorData.error || 'Failed to create PaymentIntent');
      }

      const paymentData = await response.json();

      // Markiere NEUE Einträge als billing_pending, aktualisiere BEREITS billing_pending Einträge
      const updatedTimeEntries = orderData.timeTracking.timeEntries.map(entry => {
        if (
          entry.category === 'additional' &&
          (entry.status === 'customer_approved' || entry.status === 'billing_pending')
        ) {
          return {
            ...entry,
            status: 'billing_pending' as const,
            paymentIntentId: paymentData.paymentIntentId,
            billingInitiatedAt:
              entry.status === 'billing_pending' && 'billingInitiatedAt' in entry
                ? entry.billingInitiatedAt
                : Timestamp.now(),
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

      return {
        paymentIntentId: paymentData.paymentIntentId,
        customerPays: paymentData.customerPays,
        companyReceives: paymentData.companyReceives,
        platformFee: paymentData.platformFee,
        clientSecret: paymentData.clientSecret,
      };
    } catch (error) {

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
                orderId: orderDoc.id, // Füge Order ID hinzu
                orderTitle: 'Auftrag',
                // Temporär für Kompatibilität - sollte entfernt werden
                timeEntries,
              } as any);
            }
          }
        }
      }

      return requests;
    } catch (error) {

      throw error;
    }
  }

  /**
   * Erweiterte Funktion: Holt alle Approval-relevanten Informationen für bessere UX
   */
  static async getApprovalStatus(customerId: string): Promise<{
    pendingRequests: CustomerApprovalRequest[];
    unsubmittedAdditionalHours: Array<{
      orderId: string;
      orderTitle: string;
      additionalEntries: TimeEntry[];
      totalHours: number;
      totalAmount: number;
      providerMessage?: string;
    }>;
    summary: {
      hasPendingApprovals: boolean;
      hasUnsubmittedHours: boolean;
      totalPendingHours: number;
      totalUnsubmittedHours: number;
      actionRequired: 'approval' | 'waiting_for_provider' | 'none';
      userFriendlyMessage: string;
    };
  }> {
    try {
      // Hole alle Aufträge des Kunden
      const ordersQuery = query(
        collection(db, 'auftraege'),
        where('customerFirebaseUid', '==', customerId)
      );

      const ordersSnapshot = await getDocs(ordersQuery);
      const pendingRequests: CustomerApprovalRequest[] = [];
      const unsubmittedAdditionalHours: Array<{
        orderId: string;
        orderTitle: string;
        additionalEntries: TimeEntry[];
        totalHours: number;
        totalAmount: number;
        providerMessage?: string;
      }> = [];

      let totalPendingHours = 0;
      let totalUnsubmittedHours = 0;

      for (const orderDoc of ordersSnapshot.docs) {
        const orderData = orderDoc.data() as AuftragWithTimeTracking;
        const orderId = orderDoc.id;
        const orderTitle = 'Auftrag';

        // 1. Sammle eingereichte Approval Requests
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

              pendingRequests.push({
                ...approvalRequest,
                orderId,
                orderTitle,
                timeEntries,
              } as any);

              totalPendingHours += approvalRequest.totalHours || 0;
            }
          }
        }

        // 2. Sammle nicht-eingereichte zusätzliche Stunden
        if (orderData.timeTracking) {
          const additionalEntries = orderData.timeTracking.timeEntries.filter(
            entry => entry.category === 'additional' && entry.status === 'logged' // Noch nicht eingereicht
          );

          if (additionalEntries.length > 0) {
            const totalHours = additionalEntries.reduce((sum, entry) => sum + entry.hours, 0);
            const totalAmount = additionalEntries.reduce(
              (sum, entry) => sum + (entry.billableAmount || 0),
              0
            );

            unsubmittedAdditionalHours.push({
              orderId,
              orderTitle,
              additionalEntries,
              totalHours,
              totalAmount,
            });

            totalUnsubmittedHours += totalHours;
          }
        }
      }

      // 3. Erstelle benutzerfreundliche Zusammenfassung
      const hasPendingApprovals = pendingRequests.length > 0;
      const hasUnsubmittedHours = unsubmittedAdditionalHours.length > 0;

      let actionRequired: 'approval' | 'waiting_for_provider' | 'none' = 'none';
      let userFriendlyMessage = '';

      if (hasPendingApprovals) {
        actionRequired = 'approval';
        const requestCount = pendingRequests.length;
        userFriendlyMessage = `${requestCount} Freigabe-Anfrage${requestCount > 1 ? 'n' : ''} warten auf Ihre Entscheidung (${totalPendingHours.toFixed(1)} Stunden)`;
      } else if (hasUnsubmittedHours) {
        actionRequired = 'waiting_for_provider';
        const orderCount = unsubmittedAdditionalHours.length;
        userFriendlyMessage = `${totalUnsubmittedHours.toFixed(1)} zusätzliche Stunden in ${orderCount} Auftrag${orderCount > 1 ? 'ägen' : ''} protokolliert, aber noch nicht zur Freigabe eingereicht. Der Anbieter muss diese zuerst einreichen.`;
      } else {
        userFriendlyMessage = 'Derzeit gibt es keine zusätzlichen Stunden zur Freigabe.';
      }

      return {
        pendingRequests,
        unsubmittedAdditionalHours,
        summary: {
          hasPendingApprovals,
          hasUnsubmittedHours,
          totalPendingHours,
          totalUnsubmittedHours,
          actionRequired,
          userFriendlyMessage,
        },
      };
    } catch (error) {

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
      const updatedEntry = {
        ...entry,
        ...updates,
        id: entryId, // ID darf nicht geändert werden
      };

      // Neu berechne billableAmount bei zusätzlichen Stunden, wenn sich die Stunden geändert haben
      if (updatedEntry.category === 'additional' && updates.hours !== undefined) {
        // Hole die Firmendetails für den korrekten Stundensatz
        const companyRef = doc(db, 'companies', orderData.selectedAnbieterId);
        const companyDoc = await getDoc(companyRef);

        if (companyDoc.exists()) {
          const companyData = companyDoc.data();
          const hourlyRateInEuros = companyData.hourlyRate || 50; // Fallback auf 50€
          const correctHourlyRateInCents = Math.round(hourlyRateInEuros * 100);

          // Debug: Log zur Überprüfung

          // Berechne billableAmount: Stunden × Stundensatz + Anfahrtskosten
          const hoursAmount = Math.round(updatedEntry.hours * correctHourlyRateInCents);
          const travelCostAmount = updatedEntry.travelCost || 0;
          updatedEntry.billableAmount = hoursAmount + travelCostAmount;
        } else {

        }
      }

      updatedTimeEntries[entryIndex] = updatedEntry;

      // Berechne neue Statistiken
      const totalLoggedHours = updatedTimeEntries.reduce((sum, e) => sum + e.hours, 0);

      // Update den Auftrag
      await updateDoc(orderRef, {
        'timeTracking.timeEntries': updatedTimeEntries,
        'timeTracking.totalLoggedHours': totalLoggedHours,
        'timeTracking.lastUpdated': serverTimestamp(),
      });

    } catch (error) {

      throw error;
    }
  }

  /**
   * Admin-Funktion: Migriert Stripe Account ID von users zu companies collection
   */
  static async migrateProviderStripeAccount(providerId: string): Promise<{
    success: boolean;
    message: string;
    migratedAccountId?: string;
  }> {
    try {
      // Hole beide Dokumente
      const usersDoc = await getDoc(doc(db, 'users', providerId));
      const companiesDoc = await getDoc(doc(db, 'companies', providerId));

      if (!usersDoc.exists()) {
        return {
          success: false,
          message: `Provider ${providerId} nicht in users-Collection gefunden`,
        };
      }

      const usersData = usersDoc.data();
      const stripeAccountId = usersData?.stripeAccountId;

      if (!stripeAccountId) {
        return {
          success: false,
          message: `Keine Stripe Account ID in users-Collection gefunden für Provider ${providerId}`,
        };
      }

      // Prüfe ob companies bereits eine ID hat
      const companiesData = companiesDoc.data();
      if (companiesData?.stripeConnectAccountId) {
        return {
          success: false,
          message: `Companies-Collection hat bereits stripeConnectAccountId: ${companiesData.stripeConnectAccountId}`,
        };
      }

      // Migriere zur companies-Collection
      const migrationData = {
        stripeConnectAccountId: stripeAccountId,
        stripeConnectStatus: usersData.stripeAccountDetailsSubmitted
          ? 'details_submitted'
          : 'pending',
        migratedFromUsers: true,
        migratedAt: serverTimestamp(),
        companyName: usersData.companyName || companiesData?.companyName || 'Unbekannt',
      };

      if (companiesDoc.exists()) {
        await updateDoc(doc(db, 'companies', providerId), migrationData);
      } else {
        // Erstelle companies-Dokument falls nicht vorhanden
        await updateDoc(doc(db, 'companies', providerId), {
          ...migrationData,
          createdAt: serverTimestamp(),
          createdByMigration: true,
        });
      }

      return {
        success: true,
        message: `Stripe Account ID ${stripeAccountId} erfolgreich migriert`,
        migratedAccountId: stripeAccountId,
      };
    } catch (error) {

      return {
        success: false,
        message: `Fehler bei der Migration: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
      };
    }
  }

  /**
   * Diagnostische Funktion für Provider Stripe Connect Status
   */
  static async diagnoseProviderStripeSetup(providerId: string): Promise<{
    hasStripeAccount: boolean;
    accountSource: 'companies' | 'users' | 'none';
    stripeAccountId?: string;
    status?: string;
    recommendations: string[];
    debugInfo: any;
  }> {
    try {
      // Prüfe companies collection
      const companiesDoc = await getDoc(doc(db, 'companies', providerId));
      const companiesData = companiesDoc.data();

      // Prüfe users collection (Fallback)
      const usersDoc = await getDoc(doc(db, 'users', providerId));
      const usersData = usersDoc.data();

      const debugInfo = {
        providerId,
        companies: {
          exists: companiesDoc.exists(),
          stripeConnectAccountId: companiesData?.stripeConnectAccountId,
          stripeConnectStatus: companiesData?.stripeConnectStatus,
          companyName: companiesData?.companyName,
        },
        users: {
          exists: usersDoc.exists(),
          stripeAccountId: usersData?.stripeAccountId,
          userType: usersData?.user_type,
          stripeAccountDetailsSubmitted: usersData?.stripeAccountDetailsSubmitted,
          stripeAccountPayoutsEnabled: usersData?.stripeAccountPayoutsEnabled,
        },
      };

      let hasStripeAccount = false;
      let accountSource: 'companies' | 'users' | 'none' = 'none';
      let stripeAccountId: string | undefined;
      let status: string | undefined;
      const recommendations: string[] = [];

      // Prüfe companies collection zuerst
      if (companiesData?.stripeConnectAccountId) {
        hasStripeAccount = true;
        accountSource = 'companies';
        stripeAccountId = companiesData.stripeConnectAccountId;
        status = companiesData.stripeConnectStatus || 'unknown';
      }
      // Fallback auf users collection
      else if (usersData?.stripeAccountId) {
        hasStripeAccount = true;
        accountSource = 'users';
        stripeAccountId = usersData.stripeAccountId;
        status = usersData.stripeAccountDetailsSubmitted ? 'details_submitted' : 'pending';

        recommendations.push(
          '✅ Stripe Account in users-Collection gefunden - Migration zu companies-Collection empfohlen'
        );
      }

      // Generiere Empfehlungen
      if (!hasStripeAccount) {
        recommendations.push('❌ Kein Stripe Connect Account gefunden');
        recommendations.push('🔧 Provider muss Registrierung abschließen: /register/company/step5');
        recommendations.push(
          '📋 Oder Admin muss manuell stripeConnectAccountId in companies-Collection hinzufügen'
        );
      } else {
        if (accountSource === 'users') {
          recommendations.push(
            '🔄 Migration der Stripe Account ID zur companies-Collection erforderlich'
          );
        }

        if (status === 'pending' || status === 'unknown') {
          recommendations.push('⏳ Stripe Connect Onboarding nicht abgeschlossen');
          recommendations.push('🔗 Provider muss Account Link vervollständigen');
        } else if (status === 'details_submitted' || status === 'active') {
          recommendations.push('✅ Stripe Connect Account ist aktiv');
        }
      }

      return {
        hasStripeAccount,
        accountSource,
        stripeAccountId,
        status,
        recommendations,
        debugInfo,
      };
    } catch (error) {

      throw error;
    }
  }

  /**
   * KUNDE-INITIIERTE FREIGABE: Kunde kann zusätzliche Stunden selbst zur Freigabe anfordern
   * Falls der Anbieter vergessen hat, die zusätzlichen Stunden einzureichen
   */
  static async customerInitiateAdditionalHoursApproval(
    orderId: string,
    customerMessage?: string
  ): Promise<{
    success: boolean;
    approvalRequestId?: string;
    message: string;
    additionalHours: number;
    totalAmount: number;
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

      // Finde alle nicht-eingereichten zusätzlichen Stunden
      const unsubmittedAdditionalEntries = orderData.timeTracking.timeEntries.filter(
        entry => entry.category === 'additional' && entry.status === 'logged'
      );

      if (unsubmittedAdditionalEntries.length === 0) {
        return {
          success: false,
          message:
            'Keine zusätzlichen Stunden gefunden, die zur Freigabe eingereicht werden können.',
          additionalHours: 0,
          totalAmount: 0,
        };
      }

      // Berechne Statistiken
      const additionalHours = unsubmittedAdditionalEntries.reduce(
        (sum, entry) => sum + entry.hours,
        0
      );
      const totalAmount = unsubmittedAdditionalEntries.reduce(
        (sum, entry) => sum + (entry.billableAmount || 0),
        0
      );

      // Erstelle automatisch eine Approval Request (Kunde-initiiert)
      const entryIds = unsubmittedAdditionalEntries.map(entry => entry.id);
      const approvalRequestId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

      const approvalRequest: CustomerApprovalRequest = {
        id: approvalRequestId,
        timeEntryIds: entryIds,
        totalHours: additionalHours,
        totalAmount,
        submittedAt: Timestamp.now(),
        status: 'pending',
        providerMessage: `🤝 Kunde-initiierte Freigabe: ${customerMessage || 'Kunde möchte zusätzliche Stunden freigeben'}`,
        customerInitiated: true, // Markierung dass Kunde die Freigabe angefordert hat
      };

      // Aktualisiere Entries auf "submitted"
      const updatedTimeEntries = orderData.timeTracking.timeEntries.map(entry => {
        if (entryIds.includes(entry.id)) {
          return {
            ...entry,
            status: 'submitted' as const,
            submittedAt: Timestamp.now(),
            customerInitiated: true,
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

      return {
        success: true,
        approvalRequestId,
        message: `✅ Erfolgreich! ${additionalHours.toFixed(1)} zusätzliche Stunden wurden zur Freigabe eingereicht. Sie können diese nun genehmigen.`,
        additionalHours,
        totalAmount,
      };
    } catch (error) {

      return {
        success: false,
        message: `Fehler beim Einreichen zur Freigabe: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        additionalHours: 0,
        totalAmount: 0,
      };
    }
  }

  /**
   * Kunde genehmigt direkt geloggte zusätzliche Stunden (vereinfachter Workflow)
   */
  static async approveLoggedAdditionalHours(orderId: string): Promise<{
    success: boolean;
    message: string;
    approvedHours: number;
    totalAmount: number;
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

      // Finde alle geloggte zusätzliche Stunden die noch nicht genehmigt sind
      const loggedAdditionalEntries = orderData.timeTracking.timeEntries.filter(
        entry => entry.category === 'additional' && entry.status === 'logged'
      );

      if (loggedAdditionalEntries.length === 0) {
        throw new Error('No logged additional hours found to approve');
      }

      // Aktualisiere alle geloggte zusätzliche Stunden auf "customer_approved"
      const updatedTimeEntries = orderData.timeTracking.timeEntries.map(entry => {
        if (entry.category === 'additional' && entry.status === 'logged') {
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

      const approvedHours = loggedAdditionalEntries.reduce((sum, entry) => sum + entry.hours, 0);
      const totalAmount = loggedAdditionalEntries.reduce(
        (sum, entry) => sum + (entry.billableAmount || 0),
        0
      );

      // Update den Auftrag
      await updateDoc(orderRef, {
        'timeTracking.timeEntries': updatedTimeEntries,
        'timeTracking.totalApprovedHours': totalApprovedHours,
        'timeTracking.status': 'fully_approved',
        'timeTracking.lastUpdated': serverTimestamp(),
      });

      return {
        success: true,
        message: `✅ ${approvedHours.toFixed(1)} zusätzliche Stunden wurden erfolgreich freigegeben und sind jetzt zur Bezahlung bereit!`,
        approvedHours,
        totalAmount,
      };
    } catch (error) {

      return {
        success: false,
        message: `Fehler bei der Freigabe: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        approvedHours: 0,
        totalAmount: 0,
      };
    }
  }

  /**
   * Berechnet Stunden aus Start- und Endzeit
   */
  static calculateHoursFromTime(
    startTime: string,
    endTime: string,
    breakMinutes: number = 0,
    travelMinutes: number = 0
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

    // ANFAHRT WIRD NICHT MEHR ZUR ARBEITSZEIT ADDIERT
    // Travel time wird jetzt als separater Kostenpunkt (travelCost) behandelt
    // workingMinutes += travelMinutes; // <- ENTFERNT

    return Math.max(0, workingMinutes / 60);
  }
}
