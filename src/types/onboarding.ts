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
  goToNextStep: () => void;
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
  1: { // General Settings
    required: ['companyName', 'businessType', 'address', 'phone', 'email'],
    validators: {
      companyName: (value: string) => !!(value && value.length >= 2),
      email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      phone: (value: string) => !!(value && value.length >= 10)
    }
  },
  2: { // Accounting & Banking
    required: ['kleinunternehmer', 'taxRate', 'iban', 'accountHolder'],
    validators: {
      iban: (value: string) => /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/.test(value?.replace(/\s/g, '') || ''),
      accountHolder: (value: string) => !!(value && value.length >= 2)
    }
  },
  3: { // Public Profile
    required: ['companyLogo', 'publicDescription', 'hourlyRate', 'workingHours'],
    minLength: {
      publicDescription: 200,
      skills: 3,
      portfolio: 1,
      faqs: 3
    },
    validators: {
      hourlyRate: (value: number) => !!(value && value > 0),
      publicDescription: (value: string) => !!(value && value.length >= 200)
    }
  },
  4: { // Services & Categories
    required: ['categories', 'servicePackages'],
    minLength: {
      categories: 1,
      servicePackages: 1
    }
  },
  5: { // Verification & Review
    required: ['agbAccepted', 'finalReview'],
    validators: {
      agbAccepted: (value: boolean) => value === true,
      finalReview: (value: boolean) => value === true
    }
  }
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
    title: "Allgemeine Einstellungen",
    description: "Grundlegende Firmeninformationen und Kontaktdaten",
    isRequired: true,
    estimatedTime: "2-3 Minuten"
  },
  {
    step: 2,
    title: "Buchhaltung & Steuern",
    description: "Steuereinstellungen und Bankverbindung",
    isRequired: true,
    estimatedTime: "2-3 Minuten"
  },
  {
    step: 3,
    title: "Öffentliches Profil",
    description: "Profilbild, Beschreibung und Arbeitszeiten",
    isRequired: true,
    estimatedTime: "5-8 Minuten"
  },
  {
    step: 4,
    title: "Services & Kategorien",
    description: "Servicekategorien und Leistungspakete",
    isRequired: true,
    estimatedTime: "3-5 Minuten"
  },
  {
    step: 5,
    title: "Überprüfung & Freischaltung",
    description: "Finale Überprüfung und Profil-Aktivierung",
    isRequired: true,
    estimatedTime: "1-2 Minuten"
  }
];
