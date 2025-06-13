// /Users/andystaudinger/Tasko/src/types/types.ts

import { DateRange } from 'react-day-picker';
import React from 'react';

// --- BENUTZER & AUTH ---
/**
 * Interface für die Profildaten eines Benutzers.
 * Vervollständigt mit allen Feldern, die in der App verwendet werden.
 */
export interface UserProfileData {
  uid: string; // Hinzufügen
  email: string; // Hinzufügen
  firstname: string;
  lastname?: string; // Hinzufügen
  user_type?: 'kunde' | 'firma'; // Hinzufügen
  stripeCustomerId?: string;
  savedPaymentMethods?: SavedPaymentMethod[];
  savedAddresses?: SavedAddress[];
  [key: string]: unknown;
}

/**
 * Interface für eine gespeicherte Adresse eines Benutzers.
 */
export interface SavedAddress {
  id: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  postal_code: string;
  country: string;
  isDefault?: boolean;
  type?: 'billing' | 'shipping' | 'other';
}

/**
 * Interface für eine gespeicherte Zahlungsmethode.
 */
export interface SavedPaymentMethod {
  id: string;
  brand?: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
  type: string;
}


// --- ANBIETER / TASKER ---

export interface CompanyTaskCategory {
  name: string;
  count: number;
  icon?: React.ReactNode;
}

export interface CompanyHighlightReview {
  text: string;
  reviewerName: string;
  reviewDate: string;
}

/**
 * Definiert die Details eines Anbieters/Unternehmens für das Frontend.
 * Basiert auf deiner Definition, aber `companyName` ist für die UI ein Pflichtfeld.
 */
export interface AnbieterDetails {
  id: string;
  companyName: string; // Gemacht zum Pflichtfeld für stabile UI
  firmenname?: string; // Beibehalten für Kompatibilität
  profilePictureURL?: string;
  profilbildUrl?: string;
  hourlyRate?: number | string;
  description?: string;
  selectedSubcategory?: string;
  subCategory?: string;
  languages?: string;
  postalCode?: string;
  city?: string;
  address?: string;
  minimumHours?: number;
  projectImages?: string[];
  location?: string;
  estimatedDuration?: string;
  taskRequiresCar?: boolean;
  taskCategories?: CompanyTaskCategory[];
  vehicleInfo?: string;
  highlightReview?: CompanyHighlightReview;
  country?: string;
  state?: string;
  totalCalculatedPrice?: number;
  stripeAccountId?: string;
}

/**
 * Repräsentiert die Rohdaten von der API. Enthält alle möglichen Feldnamen.
 */
export interface ApiAnbieter {
  id: string;
  firmenname?: string;
  companyName?: string;
  profilbildUrl?: string;
  profilePictureURL?: string;
  hourlyRate?: number | string;
  description?: string;
  stripeAccountId?: string;
  // Hier können bei Bedarf weitere API-Felder hinzugefügt werden
}

export interface RatingInfo {
  avg: number;
  count: number;
  subCounts?: Record<string, number>;
  category?: string;
}

export interface RatingMap {
  [companyId: string]: RatingInfo;
}

export interface ExpandedDescriptionsMap {
  [companyId: string]: boolean;
}


// --- BUCHUNG & AUFTRAG ---

export interface TaskDetails {
  description: string;
}

export interface BookingCharacteristics {
  datePickerMode: 'single' | 'range';
  durationLabel: string;
  durationPlaceholder: string;
  durationHint: string;
  isDurationPerDay: boolean;
  defaultDurationHours: number;
}

export interface DateTimeSelectionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dateSelection?: Date | DateRange, time?: string, duration?: string) => void;
  initialDateRange?: DateRange;
  initialTime?: string;
  initialDuration?: string;
  contextCompany?: AnbieterDetails | null;
  bookingSubcategory?: string | null;
}

export interface OrderListItem {
  id: string;
  selectedSubcategory: string;
  status: string;
  totalPriceInCents: number;
  jobDateFrom?: string;
  jobTimePreference?: string;
}

export interface AngebotDetails {
  price: number;
  description?: string;
}

export interface OrderSummaryProps {
  anbieterDetails: AnbieterDetails | null;
  angebotDetails: AngebotDetails | null;
  dateFrom: string | null;
  dateTo: string | null;
  time: string | null;
}

export interface PaymentDetailsFormProps {
  checkoutData?: Record<string, unknown>;
  onCheckoutAttempted?: (error?: string) => void;
}