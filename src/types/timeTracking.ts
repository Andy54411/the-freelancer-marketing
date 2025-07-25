// /Users/andystaudinger/Tasko/src/types/timeTracking.ts

import { Timestamp } from 'firebase/firestore';

export interface TimeEntry {
    id?: string;
    orderId: string;
    providerId: string;
    customerId: string;
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

export interface OrderTimeTracking {
    orderId: string;
    originalPlannedHours: number;
    totalLoggedHours: number;
    totalApprovedHours: number;
    totalBilledHours: number;
    hourlyRate: number; // In Cents
    entries: TimeEntry[];
    status:
    | 'active'
    | 'submitted_for_approval'
    | 'partially_approved'
    | 'fully_approved'
    | 'completed';
    customerFeedback?: string;
    lastUpdated: Timestamp;
}

export interface CustomerApprovalRequest {
    id?: string;
    orderId: string;
    providerId: string;
    customerId: string;
    timeEntries: TimeEntry[];
    totalHours: number;
    totalAmount: number; // In Cents
    submittedAt: Timestamp;
    status: 'pending' | 'approved' | 'rejected' | 'partially_approved';
    customerFeedback?: string;
    customerResponseAt?: Timestamp;
    providerMessage?: string;
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
