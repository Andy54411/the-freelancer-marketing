// /Users/andystaudinger/tasko/src/app/auftrag/get-started/[unterkategorie]/adresse/components/lib/types.ts
import { DateRange } from 'react-day-picker';
import React from 'react'; // Hinzugefügt für React.ReactNode

export interface CompanyTaskCategory {
  name: string;
  count: number;
  icon?: React.ReactNode; // Geändert von any zu React.ReactNode
}

export interface CompanyHighlightReview {
  text: string;
  reviewerName: string;
  reviewDate: string;
}

export interface Company {
  id: string;
  companyName: string;
  profilePictureURL?: string;
  hourlyRate?: number | string;
  description?: string;
  selectedSubcategory?: string;
  languages?: string;
  postalCode?: string; // Bleibt optional, wichtig für Suche
  city?: string; // Bleibt optional, da es aus dem öffentlichen Profil entfernt werden soll
  address?: string; // Bleibt optional, da es aus dem öffentlichen Profil entfernt werden soll
  minimumHours?: number;
  projectImages?: string[];
  location?: string;
  estimatedDuration?: string;
  taskRequiresCar?: boolean;
  taskCategories?: CompanyTaskCategory[];
  vehicleInfo?: string;
  highlightReview?: CompanyHighlightReview;
  country?: string; // Bleibt optional
  state?: string; // Bleibt optional
  totalCalculatedPrice?: number;
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

export interface TaskDetails {
  description: string;
}

export interface DateTimeSelectionPopupPropsShared {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selection?: Date | DateRange, time?: string, duration?: string) => void;
  initialDateRange?: DateRange;
  initialTime?: string;
  initialDuration?: string;
  mode: 'single' | 'range';
  contextCompany?: Company | null;
}