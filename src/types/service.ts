// Shared types for service components

export interface AddonItem {
  name: string;
  description: string;
  price: number;
}

export interface ServicePackage {
  id?: string;
  tier?: 'basic' | 'standard' | 'premium';
  packageType?: 'basic' | 'standard' | 'premium'; // Firebase field name
  serviceId?: string;
  name: string;
  title: string;
  description: string;
  price: number;
  deliveryTime?: number;
  duration?: number;
  features: string[];
  revisions: number;
  active: boolean;
  additionalServices?: AddonItem[];
  subcategory?: string;
}

export interface PackageFormData {
  tier: 'basic' | 'standard' | 'premium';
  price: number;
  deliveryTime: number;
  deliveryUnit?: string;
  hasDuration?: boolean;
  duration: number;
  description: string;
  features: string[];
  additionalServices: AddonItem[];
  revisions?: number; // Optional für Kategorien die Revisionen benötigen
}

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  subcategory: string;
  packages: {
    basic: ServicePackage;
    standard: ServicePackage;
    premium: ServicePackage;
  };
  addons: AddonItem[];
  additionalServices?: AddonItem[]; // Legacy field for compatibility
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  activePackages?: string[]; // Neue optionale Eigenschaft
}

export interface ServiceFormData {
  serviceItems: ServiceItem[];
}

// Service time labels for different categories
export interface ServiceTimeLabels {
  durationLabel: string;
  deliveryTimeLabel: string;
  timeType: 'duration' | 'deliveryTime';
}

// Package data structure for form state
export interface PackageDataState {
  basic: PackageFormData;
  standard: PackageFormData;
  premium: PackageFormData;
}