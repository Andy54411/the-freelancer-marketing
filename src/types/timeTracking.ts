// /Users/andystaudinger/Tasko/src/types/timeTracking.ts

import { Timestamp } from 'firebase/firestore';

export interface TimeEntry {
  id: string; // Unique ID für die Entry
  date: string; // YYYY-MM-DD format
  startTime: string; // HH:MM format
  endTime?: string; // HH:MM format
  hours: number; // Berechnete oder eingegebene Stunden
  description: string;
  category: 'original' | 'additional'; // Original geplant oder zusätzlich
  status:
    | 'logged'
    | 'submitted'
    | 'customer_approved'
    | 'customer_rejected'
    | 'escrow_authorized'
    | 'escrow_released'
    | 'platform_held'
    | 'platform_released'
    | 'billed';
  isBreakTime?: boolean; // Pausenzeit abziehen
  breakMinutes?: number;
  travelTime?: boolean; // Anfahrt hinzufügen
  travelMinutes?: number; // Anfahrtsdauer in Minuten (nur für Anzeige)
  travelCost?: number; // Anfahrtskosten in Cents (feste Pauschale)
  createdAt: Timestamp;
  submittedAt?: Timestamp;
  customerResponseAt?: Timestamp;
  billableAmount?: number; // In Cents
  notes?: string;
  // Escrow-System Felder (LEGACY)
  escrowPaymentIntentId?: string; // Stripe PaymentIntent ID für gehaltenes Geld
  escrowAuthorizedAt?: Timestamp; // Wann das Geld autorisiert/gehalten wurde
  escrowReleasedAt?: Timestamp; // Wann das Geld freigegeben wurde
  escrowStatus?: 'none' | 'authorized' | 'released' | 'failed'; // Status des Escrow-Prozesses

  // Platform Hold System Felder (NEU)
  platformHoldPaymentIntentId?: string; // Stripe PaymentIntent ID für Platform Hold
  platformHoldAt?: Timestamp; // Wann das Geld auf Platform Account gehalten wurde
  platformHoldStatus?: 'none' | 'held' | 'transferred' | 'failed'; // Platform Hold Status
  transferId?: string; // Stripe Transfer ID vom Platform zu Provider
  transferredAt?: Timestamp; // Wann der Transfer durchgeführt wurde
}

// TimeTracking wird direkt im Auftrag gespeichert
export interface OrderTimeTracking {
  isActive: boolean; // Ob TimeTracking für diesen Auftrag aktiv ist
  originalPlannedHours: number;
  totalLoggedHours: number;
  totalApprovedHours: number;
  totalBilledHours: number;
  hourlyRate: number; // In Cents (aus Auftrag übernommen)
  timeEntries: TimeEntry[]; // Array von Zeiteinträgen
  status:
    | 'inactive'
    | 'active'
    | 'submitted_for_approval'
    | 'partially_approved'
    | 'fully_approved'
    | 'escrow_pending' // Geld ist autorisiert/gehalten
    | 'completed'; // Geld ist freigegeben
  customerFeedback?: string | null;
  lastUpdated: Timestamp;
  inititalizedAt?: Timestamp; // Wann TimeTracking gestartet wurde
  // Escrow-System Felder
  escrowPaymentIntents?: EscrowPaymentIntent[]; // Alle gehaltenen PaymentIntents
  projectCompletionStatus?: ProjectCompletionStatus; // Status der Projektabnahme
}

// Escrow PaymentIntent Tracking
export interface EscrowPaymentIntent {
  id: string; // Stripe PaymentIntent ID
  amount: number; // In Cents - Kundenzahlung
  companyAmount: number; // In Cents - Was die Firma erhält (minus Plattformgebühr)
  platformFee: number; // In Cents - Plattformgebühr
  entryIds: string[]; // TimeEntry IDs die zu dieser Zahlung gehören
  authorizedAt: Timestamp; // Wann autorisiert
  releasedAt?: Timestamp; // Wann freigegeben (optional)
  status: 'authorized' | 'released' | 'failed' | 'cancelled';
  clientSecret: string; // Für Frontend
}

// Projektabnahme Status
export interface ProjectCompletionStatus {
  customerMarkedComplete: boolean; // Kunde hat Projekt als erledigt markiert
  customerCompletedAt?: Timestamp;
  providerMarkedComplete: boolean; // Anbieter hat Projekt als erledigt markiert
  providerCompletedAt?: Timestamp;
  bothPartiesComplete: boolean; // Beide haben bestätigt → Geld kann freigegeben werden
  finalCompletionAt?: Timestamp; // Wann beide bestätigt haben
  escrowReleaseInitiated: boolean; // Ob Escrow-Freigabe bereits gestartet wurde
  escrowReleaseAt?: Timestamp; // Wann Freigabe durchgeführt wurde
}

// Approval Requests werden direkt im Auftrag verwaltet
export interface CustomerApprovalRequest {
  id: string; // Unique ID für die Approval Request
  timeEntryIds: string[]; // IDs der Zeiteinträge für diese Request
  totalHours: number;
  totalAmount: number; // In Cents
  submittedAt: Timestamp;
  status: 'pending' | 'approved' | 'rejected' | 'partially_approved';
  customerFeedback?: string | null;
  customerResponseAt?: Timestamp;
  providerMessage?: string;
  approvedEntryIds?: string[]; // Bei partial approval
  timeEntries?: TimeEntry[]; // Für UI-Anzeige, wird zur Laufzeit hinzugefügt
  customerInitiated?: boolean; // Flag: Wurde vom Kunden selbst initiiert?
}

// Erweiterte Auftrag-Schnittstelle für TimeTracking
export interface AuftragWithTimeTracking {
  // Alle bestehenden Auftrag-Felder
  id: string;
  status: string;
  selectedAnbieterId: string;
  customerFirebaseUid: string;
  jobTotalCalculatedHours: number;
  originalJobPriceInCents: number;

  // Zusätzliche Live-Daten Felder
  jobCalculatedPriceInCents?: number;
  jobDateFrom?: string;
  jobDateTo?: string;
  jobDurationString?: string;
  providerName?: string;
  customerFirstName?: string;
  customerLastName?: string;

  // TimeTracking-Erweiterung
  timeTracking?: OrderTimeTracking;
  approvalRequests?: CustomerApprovalRequest[];
}

export interface TimeTrackingStats {
  totalActiveOrders: number;
  totalLoggedHours: number;
  totalPendingApproval: number;
  totalApprovedHours: number;
  pendingPayoutAmount: number; // In Cents
  averageHoursPerOrder: number;
  lastUpdated: Timestamp;
}
