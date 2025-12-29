// Types für das Company Onboarding System
export interface CompanyOnboardingStatus {
  uid: string;
  status: 'pending_onboarding' | 'in_progress' | 'completed' | 'approved' | 'rejected';
  completedSteps: string[];
  currentStep: string;
  startedAt: Date;
  completedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  // Integration mit Registration
  registrationCompletedAt: Date;
  registrationMethod: 'new_registration' | 'existing_grandfathered';
  stepData: Record<string, any>;
  completionPercentage: number;
}

export interface OnboardingContextType {
  // Current State
  currentStep: number;
  totalSteps: number;
  completionPercentage: number;

  // Navigation Control (Stripe-Style)
  canGoNext: () => boolean;
  canGoBack: () => boolean;
  canJumpToStep: (step: number) => boolean;

  // Data Management
  stepData: Record<number, any>;
  allStepsValid: boolean;

  // Auto-Save like Stripe
  autoSaveEnabled: boolean;
  lastSaved: Date | null;
  isSaving: boolean;

  // Progress Tracking
  getStepCompletion: (step: number) => number; // 0-100%
  getOverallCompletion: () => number;

  // Onboarding Management
  onboardingStatus: CompanyOnboardingStatus | null;
  stepsData: StepNavigationInfo[];

  // Actions
  goToStep: (step: number) => void;
  goToNextStep: (skipValidation?: boolean) => void;
  goToPreviousStep: () => void;
  updateStepData: (step: number, data: Partial<any>) => void;
  saveCurrentStep: () => Promise<void>;
  submitOnboarding: () => Promise<void>;
  startOnboarding: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

export interface OnboardingStepProps {
  stepNumber: number;
  stepData: any;
  onStepDataChange: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
}

export interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  completionPercentage: number;
  stepsData: {
    step: number;
    title: string;
    isCompleted: boolean;
    isOptional: boolean;
  }[];
}

// Step Validation Rules
export interface ValidationRule {
  required?: string[];
  validators?: Record<string, (value: any) => boolean>;
  minLength?: Record<string, number>;
  conditional?: Record<string, (data: any) => boolean>;
}

export const stepValidationRules: Record<number, ValidationRule> = {
  1: {
    // Harmonisierte Step 1: Erweiterte Unternehmensdaten (keine Registration-Duplikate)
    required: ['businessType', 'employees'],
    validators: {
      businessType: (value: string) => ['b2b', 'b2c', 'hybrid'].includes(value),
      employees: (value: string) => !!(value && value.length > 0),
      website: (value: string) => !value || /^https?:\/\/.+/.test(value), // Optional aber wenn gesetzt, dann URL
    },
    conditional: {
      managerData: (data: any) => {
        // Manager data ist nur bei bestimmten Rechtsformen required
        // Wird nur gesetzt wenn es nicht bereits aus Registration kommt
        return true; // Für jetzt optional, da es aus Registration kommen könnte
      },
    },
  },
  2: {
    // Harmonisierte Step 2: Steuerliche Zusatzeinstellungen (keine Banking-Duplikate)
    required: ['kleinunternehmer', 'profitMethod', 'priceInput', 'taxRate'],
    validators: {
      kleinunternehmer: (value: string) => ['ja', 'nein'].includes(value),
      profitMethod: (value: string) => ['euer', 'bilanz'].includes(value),
      priceInput: (value: string) => ['brutto', 'netto'].includes(value),
      taxRate: (value: string) => !!(value && !isNaN(Number(value))),
    },
  },
  3: {
    // Harmonisierte Step 3: Profil & Branding
    required: ['skills'], // Mindestens Skills sollten ausgefüllt werden
    validators: {
      skills: (value: string[]) => Array.isArray(value) && value.length > 0,
      companyLogo: (value: string) => !value || value.length > 0, // Wenn gesetzt, dann gültig
      profileBannerImage: (value: string) => !value || value.length > 0, // Wenn gesetzt, dann gültig
    },
    minLength: {
      skills: 1, // Mindestens 1 Skill
    },
  },
  4: {
    // Harmonisierte Step 4: Service-Bereich & Verfügbarkeit
    required: ['availabilityType', 'advanceBookingHours', 'travelCosts', 'maxTravelDistance'],
    validators: {
      availabilityType: (value: string) => ['flexible', 'fixed', 'on-demand'].includes(value),
      advanceBookingHours: (value: number) => !!(value && value > 0 && value <= 720), // Max 30 Tage
      travelCosts: (value: boolean) => typeof value === 'boolean',
      maxTravelDistance: (value: number) => !!(value && value > 0 && value <= 500), // Max 500km
      travelCostPerKm: (value: number) => !value || (value >= 0 && value <= 5), // Optional, aber wenn gesetzt max 5€/km
    },
    conditional: {
      travelCostPerKm: (data: any) => {
        // Wenn travelCosts aktiviert ist, dann ist travelCostPerKm required
        if (data.travelCosts === true) {
          return typeof data.travelCostPerKm === 'number' && data.travelCostPerKm >= 0;
        }
        return true; // Nicht required wenn travelCosts false
      },
    },
  },
  5: {
    // Harmonisierte Step 5: Finalisierung
    required: ['documentsCompleted'],
    validators: {
      documentsCompleted: (value: boolean) => value === true,
    },
  },
};

export interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  completionPercentage: number;
  stepsData: Array<{
    step: number;
    title: string;
    isCompleted: boolean;
    isOptional: boolean;
  }>;
  canGoNext: boolean;
  canGoBack: boolean;
  onNext: () => void;
  onBack: () => void;
  isSaving: boolean;
  lastSaved: Date | null;
}

export interface StepNavigationInfo {
  step: number;
  title: string;
  description: string;
  isRequired: boolean;
  estimatedTime: string;
  isCompleted?: boolean;
}

export const onboardingSteps: StepNavigationInfo[] = [
  {
    step: 1,
    title: 'Allgemeine Einstellungen',
    description: 'Grundlegende Firmeninformationen und Kontaktdaten',
    isRequired: true,
    estimatedTime: '2-3 Minuten',
  },
  {
    step: 2,
    title: 'Buchhaltung & Steuern',
    description: 'Steuereinstellungen und Bankverbindung',
    isRequired: true,
    estimatedTime: '2-3 Minuten',
  },
  {
    step: 3,
    title: 'Öffentliches Profil',
    description: 'Profilbild, Beschreibung und Arbeitszeiten',
    isRequired: true,
    estimatedTime: '5-8 Minuten',
  },
  {
    step: 4,
    title: 'Services & Kategorien',
    description: 'Servicekategorien und Leistungspakete',
    isRequired: true,
    estimatedTime: '3-5 Minuten',
  },
  {
    step: 5,
    title: 'E-Mail-Verbindung',
    description: 'Gmail verbinden oder Taskilo E-Mail erstellen',
    isRequired: false,
    estimatedTime: '1-2 Minuten',
  },
  {
    step: 6,
    title: 'Überprüfung & Freischaltung',
    description: 'Finale Überprüfung und Profil-Aktivierung',
    isRequired: true,
    estimatedTime: '1-2 Minuten',
  },
];
