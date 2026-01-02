/**
 * Availability Types - Verfügbarkeit und blockierte Tage
 * 
 * Firestore Collection: /companies/{companyId}/blockedDates/{blockedDateId}
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Blockierter Tag - Speichert wann ein Unternehmen nicht verfügbar ist
 */
export interface BlockedDate {
  id: string;
  date: string;                    // ISO Date String: "2026-01-15"
  reason?: string;                 // "Urlaub", "Betriebsferien", "Privat", etc.
  blockType: 'full_day' | 'time_range';
  startTime?: string;              // Falls time_range: "08:00"
  endTime?: string;                // Falls time_range: "18:00"
  recurring: boolean;
  recurringPattern?: RecurringPattern;
  createdAt: Timestamp;
  createdBy: string;               // User UID
  updatedAt?: Timestamp;
  isActive: boolean;               // Soft delete
}

export interface RecurringPattern {
  type: 'weekly' | 'monthly' | 'yearly';
  dayOfWeek?: number;              // 0-6 für weekly (0=Sonntag, 1=Montag, etc.)
  dayOfMonth?: number;             // 1-31 für monthly
  monthOfYear?: number;            // 1-12 für yearly
}

/**
 * Arbeitszeiten eines Unternehmens
 */
export interface WorkingHours {
  start: string;                   // "08:00"
  end: string;                     // "18:00"
}

/**
 * Verfügbarkeitseinstellungen eines Unternehmens
 */
export interface CompanyAvailability {
  availabilityType: 'flexible' | 'fixed' | 'on-demand';
  advanceBookingHours: number;     // Mindestvorlaufzeit in Stunden
  maxTravelDistance?: number;
  workingDays: number[];           // [1,2,3,4,5] = Mo-Fr (0=So, 1=Mo, etc.)
  workingHours?: WorkingHours;
}

/**
 * API Response für Verfügbarkeitsabfrage
 */
export interface AvailabilityResponse {
  blockedDates: string[];          // Array von ISO Dates: ["2026-01-15", "2026-01-16"]
  workingDays: number[];           // [1,2,3,4,5]
  workingHours?: WorkingHours;
  advanceBookingHours: number;
  availabilityType: string;
}

/**
 * Request zum Blockieren eines Datums
 */
export interface BlockDateRequest {
  date: string;                    // "2026-01-15"
  reason?: string;
  blockType: 'full_day' | 'time_range';
  startTime?: string;
  endTime?: string;
  recurring?: boolean;
  recurringPattern?: RecurringPattern;
}

/**
 * Darstellung eines blockierten Tages im Kalender
 */
export interface CalendarBlockedDay {
  date: string;
  reason?: string;
  isRecurring: boolean;
  displayText: string;
}
