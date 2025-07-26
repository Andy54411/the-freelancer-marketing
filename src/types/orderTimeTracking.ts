// /Users/andystaudinger/Tasko/src/types/orderTimeTracking.ts

import { Timestamp } from 'firebase/firestore';

export interface TimeEntry {
  id: string;
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

export interface CustomerApprovalRequest {
  id: string;
  timeEntryIds: string[];
  totalHours: number;
  totalAmount: number; // In Cents
  submittedAt: Timestamp;
  status: 'pending' | 'approved' | 'rejected' | 'partially_approved';
  customerFeedback?: string;
  customerResponseAt?: Timestamp;
  providerMessage?: string;
}

export interface OrderTimeTracking {
  originalPlannedHours: number;
  totalLoggedHours: number;
  totalApprovedHours: number;
  totalBilledHours: number;
  hourlyRate: number; // In Cents
  timeEntries: TimeEntry[];
  approvalRequests: CustomerApprovalRequest[];
  status:
    | 'active'
    | 'submitted_for_approval'
    | 'partially_approved'
    | 'fully_approved'
    | 'completed';
  customerFeedback?: string;
  lastUpdated: Timestamp;
}

export interface TimeTrackingStats {
  totalActiveOrders: number;
  totalLoggedHours: number;
  totalPendingApproval: number;
  totalApprovedHours: number;
  pendingPayoutAmount: number;
  averageHoursPerOrder: number;
  lastUpdated: Timestamp;
}

// Extended Order interface mit TimeTracking
export interface OrderWithTimeTracking {
  // Basis Auftrag Felder
  id: string;
  customerFirebaseUid: string;
  selectedAnbieterId: string;
  status: 'AKTIV' | 'ABGESCHLOSSEN' | 'completed' | 'cancelled';
  jobTotalCalculatedHours: number;
  originalJobPriceInCents: number;
  selectedCategory: string;
  selectedSubcategory: string;
  description: string;
  createdAt: Timestamp;
  lastUpdatedAt: Timestamp;

  // TimeTracking Feld
  timeTracking?: OrderTimeTracking;
}
