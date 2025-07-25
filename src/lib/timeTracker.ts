// /Users/andystaudinger/Tasko/src/lib/timeTracker.ts

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import {
  TimeEntry,
  OrderTimeTracking,
  CustomerApprovalRequest,
  TimeTrackingStats,
} from '@/types/timeTracking';

export class TimeTracker {
  /**
   * Startet Time Tracking für einen aktiven Auftrag
   */
  static async initializeOrderTimeTracking(
    orderId: string,
    providerId: string,
    customerId: string,
    originalPlannedHours: number,
    hourlyRate: number
  ): Promise<void> {
    try {
      const orderTimeTracking: Omit<OrderTimeTracking, 'id'> = {
        orderId,
        originalPlannedHours,
        totalLoggedHours: 0,
        totalApprovedHours: 0,
        totalBilledHours: 0,
        hourlyRate: hourlyRate * 100, // Convert to cents
        entries: [],
        status: 'active',
        lastUpdated: serverTimestamp() as Timestamp,
      };

      await setDoc(doc(db, 'orderTimeTracking', orderId), orderTimeTracking);
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
    providerId: string,
    customerId: string,
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
      const timeEntry: Omit<TimeEntry, 'id'> = {
        ...entry,
        orderId,
        providerId,
        customerId,
        status: 'logged',
        createdAt: serverTimestamp() as Timestamp,
      };

      // Berechne billableAmount
      if (entry.category === 'additional') {
        const orderTrackingRef = doc(db, 'orderTimeTracking', orderId);
        const orderTrackingDoc = await getDoc(orderTrackingRef);

        if (orderTrackingDoc.exists()) {
          const trackingData = orderTrackingDoc.data() as OrderTimeTracking;
          timeEntry.billableAmount = Math.round(entry.hours * trackingData.hourlyRate);
        }
      }

      const docRef = await addDoc(collection(db, 'timeEntries'), timeEntry);

      // Aktualisiere Order Time Tracking
      await this.updateOrderTimeTracking(orderId);

      console.log('[TimeTracker] Time entry logged:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('[TimeTracker] Error logging time entry:', error);
      throw error;
    }
  }

  /**
   * Zeiteintragung bearbeiten
   */
  static async updateTimeEntry(entryId: string, updates: Partial<TimeEntry>): Promise<void> {
    try {
      const entryRef = doc(db, 'timeEntries', entryId);
      const entryDoc = await getDoc(entryRef);

      if (!entryDoc.exists()) {
        throw new Error('Time entry not found');
      }

      const entryData = entryDoc.data() as TimeEntry;

      // Nur bearbeitbar wenn noch nicht submitted
      if (entryData.status !== 'logged') {
        throw new Error('Cannot edit submitted time entries');
      }

      await updateDoc(entryRef, {
        ...updates,
        lastUpdated: serverTimestamp(),
      });

      // Aktualisiere Order Time Tracking
      await this.updateOrderTimeTracking(entryData.orderId);

      console.log('[TimeTracker] Time entry updated:', entryId);
    } catch (error) {
      console.error('[TimeTracker] Error updating time entry:', error);
      throw error;
    }
  }

  /**
   * Zeiteintragung löschen
   */
  static async deleteTimeEntry(entryId: string): Promise<void> {
    try {
      const entryRef = doc(db, 'timeEntries', entryId);
      const entryDoc = await getDoc(entryRef);

      if (!entryDoc.exists()) {
        throw new Error('Time entry not found');
      }

      const entryData = entryDoc.data() as TimeEntry;

      // Nur löschbar wenn noch nicht submitted
      if (entryData.status !== 'logged') {
        throw new Error('Cannot delete submitted time entries');
      }

      await deleteDoc(entryRef);

      // Aktualisiere Order Time Tracking
      await this.updateOrderTimeTracking(entryData.orderId);

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
      const entriesQuery = query(
        collection(db, 'timeEntries'),
        where('orderId', '==', orderId),
        orderBy('date', 'desc'),
        orderBy('startTime', 'desc')
      );

      const entriesSnapshot = await getDocs(entriesQuery);
      return entriesSnapshot.docs.map(
        doc =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as TimeEntry
      );
    } catch (error) {
      console.error('[TimeTracker] Error getting time entries:', error);
      throw error;
    }
  }

  /**
   * Zeiteinträge zur Kundenfreigabe einreichen
   */
  static async submitForCustomerApproval(
    orderId: string,
    providerId: string,
    entryIds: string[],
    providerMessage?: string
  ): Promise<string> {
    try {
      const batch = writeBatch(db);

      // Hole alle Einträge
      const entries: TimeEntry[] = [];
      for (const entryId of entryIds) {
        const entryDoc = await getDoc(doc(db, 'timeEntries', entryId));
        if (entryDoc.exists()) {
          entries.push({ id: entryDoc.id, ...entryDoc.data() } as TimeEntry);
        }
      }

      if (entries.length === 0) {
        throw new Error('No valid time entries found');
      }

      const customerId = entries[0].customerId;
      const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);

      // Berechne Gesamtbetrag (nur zusätzliche Stunden)
      const additionalEntries = entries.filter(entry => entry.category === 'additional');
      const totalAmount = additionalEntries.reduce(
        (sum, entry) => sum + (entry.billableAmount || 0),
        0
      );

      // Erstelle Approval Request
      const approvalRequest: Omit<CustomerApprovalRequest, 'id'> = {
        orderId,
        providerId,
        customerId,
        timeEntries: entries,
        totalHours,
        totalAmount,
        submittedAt: serverTimestamp() as Timestamp,
        status: 'pending',
        providerMessage,
      };

      const approvalRef = await addDoc(collection(db, 'customerApprovalRequests'), approvalRequest);

      // Aktualisiere Einträge auf "submitted"
      for (const entry of entries) {
        if (entry.id) {
          batch.update(doc(db, 'timeEntries', entry.id), {
            status: 'submitted',
            submittedAt: serverTimestamp(),
          });
        }
      }

      // Aktualisiere Order Time Tracking
      batch.update(doc(db, 'orderTimeTracking', orderId), {
        status: 'submitted_for_approval',
        lastUpdated: serverTimestamp(),
      });

      await batch.commit();

      console.log('[TimeTracker] Submitted for customer approval:', approvalRef.id);
      return approvalRef.id;
    } catch (error) {
      console.error('[TimeTracker] Error submitting for approval:', error);
      throw error;
    }
  }

  /**
   * Kunde genehmigt/lehnt Zeiteinträge ab
   */
  static async processCustomerApproval(
    approvalRequestId: string,
    customerId: string,
    decision: 'approved' | 'rejected' | 'partially_approved',
    approvedEntryIds?: string[],
    customerFeedback?: string
  ): Promise<void> {
    try {
      const batch = writeBatch(db);
      const approvalRef = doc(db, 'customerApprovalRequests', approvalRequestId);
      const approvalDoc = await getDoc(approvalRef);

      if (!approvalDoc.exists()) {
        throw new Error('Approval request not found');
      }

      const approvalData = approvalDoc.data() as CustomerApprovalRequest;

      // Verify customer permission
      if (approvalData.customerId !== customerId) {
        throw new Error('Not authorized to process this approval');
      }

      // Aktualisiere Approval Request
      batch.update(approvalRef, {
        status: decision,
        customerFeedback,
        customerResponseAt: serverTimestamp(),
      });

      // Aktualisiere Time Entries basierend auf Entscheidung
      for (const entry of approvalData.timeEntries) {
        if (!entry.id) continue;

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

        batch.update(doc(db, 'timeEntries', entry.id), {
          status: newStatus,
          customerResponseAt: serverTimestamp(),
        });
      }

      // Aktualisiere Order Time Tracking
      const orderTrackingRef = doc(db, 'orderTimeTracking', approvalData.orderId);
      let orderStatus: OrderTimeTracking['status'];

      if (decision === 'approved') {
        orderStatus = 'fully_approved';
      } else if (decision === 'rejected') {
        orderStatus = 'active'; // Zurück zu aktiv
      } else {
        orderStatus = 'partially_approved';
      }

      batch.update(orderTrackingRef, {
        status: orderStatus,
        customerFeedback,
        lastUpdated: serverTimestamp(),
      });

      await batch.commit();

      // Aktualisiere Order Time Tracking Statistiken
      await this.updateOrderTimeTracking(approvalData.orderId);

      console.log('[TimeTracker] Customer approval processed:', approvalRequestId);
    } catch (error) {
      console.error('[TimeTracker] Error processing customer approval:', error);
      throw error;
    }
  }

  /**
   * Genehmigte Stunden in Stripe abrechnen
   */
  static async billApprovedHours(
    orderId: string,
    providerId: string
  ): Promise<{ paymentIntentId: string; amount: number }> {
    try {
      // Hole genehmigte zusätzliche Stunden
      const entriesQuery = query(
        collection(db, 'timeEntries'),
        where('orderId', '==', orderId),
        where('category', '==', 'additional'),
        where('status', '==', 'customer_approved')
      );

      const entriesSnapshot = await getDocs(entriesQuery);
      const approvedEntries = entriesSnapshot.docs.map(
        doc =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as TimeEntry
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

      // TODO: Implementiere Stripe Payment Intent für zusätzliche Stunden
      // Ähnlich wie in create-payment-intent/route.ts aber für zusätzliche Stunden

      // Für jetzt simuliert - in echter Implementierung Stripe API aufrufen
      const mockPaymentIntentId = `pi_additional_${Date.now()}`;

      // Markiere Einträge als abgerechnet
      const batch = writeBatch(db);

      for (const entry of approvedEntries) {
        if (entry.id) {
          batch.update(doc(db, 'timeEntries', entry.id), {
            status: 'billed',
            lastUpdated: serverTimestamp(),
          });
        }
      }

      // Aktualisiere Order Time Tracking
      batch.update(doc(db, 'orderTimeTracking', orderId), {
        status: 'completed',
        lastUpdated: serverTimestamp(),
      });

      await batch.commit();

      console.log('[TimeTracker] Billed approved hours:', { orderId, amount: totalAmount });
      return { paymentIntentId: mockPaymentIntentId, amount: totalAmount };
    } catch (error) {
      console.error('[TimeTracker] Error billing approved hours:', error);
      throw error;
    }
  }

  /**
   * Order Time Tracking Statistiken aktualisieren
   */
  private static async updateOrderTimeTracking(orderId: string): Promise<void> {
    try {
      const entries = await this.getTimeEntriesForOrder(orderId);

      const totalLoggedHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
      const totalApprovedHours = entries
        .filter(entry => entry.status === 'customer_approved' || entry.status === 'billed')
        .reduce((sum, entry) => sum + entry.hours, 0);
      const totalBilledHours = entries
        .filter(entry => entry.status === 'billed')
        .reduce((sum, entry) => sum + entry.hours, 0);

      await updateDoc(doc(db, 'orderTimeTracking', orderId), {
        totalLoggedHours,
        totalApprovedHours,
        totalBilledHours,
        lastUpdated: serverTimestamp(),
      });

      console.log('[TimeTracker] Updated order time tracking:', orderId);
    } catch (error) {
      console.error('[TimeTracker] Error updating order time tracking:', error);
      throw error;
    }
  }

  /**
   * Statistiken für Provider abrufen
   */
  static async getProviderTimeTrackingStats(providerId: string): Promise<TimeTrackingStats> {
    try {
      // Hole alle aktiven Order Time Trackings für Provider
      const ordersQuery = query(
        collection(db, 'auftraege'),
        where('selectedAnbieterId', '==', providerId),
        where('status', 'in', ['AKTIV', 'completed'])
      );

      const ordersSnapshot = await getDocs(ordersQuery);
      const orderIds = ordersSnapshot.docs.map(doc => doc.id);

      let totalActiveOrders = 0;
      let totalLoggedHours = 0;
      let totalPendingApproval = 0;
      let totalApprovedHours = 0;
      let pendingPayoutAmount = 0;

      // Hole Time Tracking für alle Orders
      for (const orderId of orderIds) {
        const trackingDoc = await getDoc(doc(db, 'orderTimeTracking', orderId));
        if (trackingDoc.exists()) {
          const tracking = trackingDoc.data() as OrderTimeTracking;

          if (tracking.status === 'active' || tracking.status === 'submitted_for_approval') {
            totalActiveOrders++;
          }

          totalLoggedHours += tracking.totalLoggedHours;
          totalApprovedHours += tracking.totalApprovedHours;

          if (tracking.status === 'submitted_for_approval') {
            totalPendingApproval += tracking.totalLoggedHours;
          }

          // Berechne ausstehende Auszahlungen (genehmigte aber noch nicht abgerechnete Stunden)
          const approvedEntries = await getDocs(
            query(
              collection(db, 'timeEntries'),
              where('orderId', '==', orderId),
              where('providerId', '==', providerId),
              where('status', '==', 'customer_approved'),
              where('category', '==', 'additional')
            )
          );

          approvedEntries.docs.forEach(doc => {
            const entry = doc.data() as TimeEntry;
            pendingPayoutAmount += entry.billableAmount || 0;
          });
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
