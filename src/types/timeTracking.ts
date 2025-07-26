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
  status: 'logged' | 'submitted' | 'customer_approved' | 'customer_rejected' | 'billed';
  isBreakTime?: boolean; // Pausenzeit abziehen
  breakMinutes?: number;
  createdAt: Timestamp;
  submittedAt?: Timestamp;
  customerResponseAt?: Timestamp;
  billableAmount?: number; // In Cents
  notes?: string;
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
    | 'completed';
  customerFeedback?: string | null;
  lastUpdated: Timestamp;
  inititalizedAt?: Timestamp; // Wann TimeTracking gestartet wurde
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
