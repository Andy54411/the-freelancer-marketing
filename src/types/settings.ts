// Types für Settings - extrahiert aus SettingsComponent
export interface RawFirestoreUserData {
  uid: string;
  companyName?: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  profileBannerImage?: string;
  profilePictureURL?: string;
  taxNumber?: string;
  taxNumberForBackend?: string;
  vatId?: string;
  vatIdForBackend?: string;
  iban?: string;
  accountHolder?: string;
  bankName?: string;
  bic?: string;
  profilePictureFirebaseUrl?: string;
  identityFrontUrlStripeId?: string;
  identityBackUrlStripeId?: string;
  // Firmen-Felder auf Root-Level (aus Datenbank)
  address?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  phoneNumber?: string;
  website?: string;
  industry?: string;
  employees?: string;
  legalForm?: string;
  kleinunternehmer?: string;
  taxRate?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  // Onboarding status
  onboardingCompleted?: boolean;
  // Tasker Profile fields (Root-Level)
  bio?: string;
  description?: string;
  selectedCategory?: string;
  selectedSubcategory?: string;
  skills?: string[];
  hourlyRate?: number;
  location?: string;
  offersVideoConsultation?: boolean;
  level?: number;
  isTopRated?: boolean;
  // E-Mail-Änderungsanfrage
  emailChangeRequest?: {
    newEmail: string;
    token: string;
    expiresAt: string;
    createdAt?: unknown;
  };
  emailChangedAt?: unknown;
  // User Profile Data (Clean structure)
  profile?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    street?: string;
    houseNumber?: string;
    postalCode?: string;
    city?: string;
    country?: string;
    dateOfBirth?: any; // Timestamp or string
  };
  // Additional root-level accounting fields
  lastInvoiceNumber?: string;
  districtCourt?: string;
  companyRegister?: string;
  registrationNumber?: string;
  ust?: string;
  profitMethod?: string;
  priceInput?: string;
  taxMethod?: string;
  accountingSystem?: string;
  defaultTaxRate?: string;
  bankName?: string;
  bic?: string;
  // Steuerliche Angaben
  finanzamt?: string;
  bundesland?: string;
  // Gesprochene Sprachen (kann auch auf Root-Level sein)
  languages?: string;
  step1?: {
    personalData?: {
      gender?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      dateOfBirth?: string;
      placeOfBirth?: string;
      nationality?: string;
      address?: {
        street?: string;
        houseNumber?: string;
        postalCode?: string;
        city?: string;
        country?: string;
      };
    };
    educationData?: {
      degree?: string;
      university?: string;
      graduationYear?: string;
      additionalCertifications?: string;
    };
    professionalData?: {
      jobTitle?: string;
      experience?: string;
      skills?: string;
      portfolio?: string;
      references?: string;
    };
    // Direkte Adresse (alternative Struktur aus Registration)
    address?: {
      street?: string;
      houseNumber?: string;
      postalCode?: string;
      city?: string;
      country?: string;
    };
    // Firma-Daten auf step1-Ebene (aus Registration)
    companyName?: string;
    legalForm?: string;
    taxNumber?: string;
    vatId?: string;
    website?: string;
    employees?: string;
    phone?: string;
    // Persönliche Daten flach
    personalStreet?: string;
    firstName?: string;
    lastName?: string;
    personalPostalCode?: string;
    phoneNumber?: string;
    email?: string;
  };
  step2?: {
    companyName?: string;
    companySuffix?: string;
    companyAddress?: {
      street?: string;
      houseNumber?: string;
      postalCode?: string;
      city?: string;
      country?: string;
    };
    // Flache Adressfelder (Alternative zu companyAddress)
    address?: string;
    street?: string;
    postalCode?: string;
    city?: string;
    companyPhone?: string;
    companyPhoneNumber?: string;
    companyEmail?: string;
    companyWebsite?: string;
    website?: string;
    fax?: string;
    languages?: string;
    industry?: string;
    employees?: string;
    taxId?: string;
    vatId?: string;
    commercialRegisterNumber?: string;
    districtCourt?: string;
    companyRegister?: string;
    legalForm?: string;
    foundingDate?: string;
    hauptberuflich?: boolean | string;
    numberOfEmployees?: string;
    businessDescription?: string;
    categories?: string[];
    subcategories?: string[];
  };
  step3?: {
    bankDetails?: {
      bankName?: string;
      iban?: string;
      bic?: string;
      accountHolder?: string;
    };
    preferredPaymentMethods?: string[];
    paymentTerms?: string;
    hourlyRate?: number;
    fixedPrices?: { [key: string]: number };
    ust?: string;
    profitMethod?: string;
    priceInput?: string;
    vatId?: string;
    taxNumber?: string;
    lastInvoiceNumber?: string;
    districtCourt?: string;
    companyRegister?: string;
    taxMethod?: string;
    defaultTaxRate?: string;
    accountingSystem?: string;
    finanzamt?: string;
    bundesland?: string;
    faqs?: any[];
    portfolio?: any[];
    profilePictureURL?: string;
    profileBannerImage?: string;
    identityFrontUrl?: string;
    identityBackUrl?: string;
    // Tasker Profile fields
    bio?: string;
    selectedCategory?: string;
    selectedSubcategory?: string;
    skills?: string[];
    location?: string;
    offersVideoConsultation?: boolean;
    level?: number;
    isTopRated?: boolean;
  };
  step4?: {
    businessLicense?: string;
    insurancePolicy?: string;
    certifications?: string[];
    additionalDocuments?: string[];
    accountHolder?: string;
    iban?: string;
    bic?: string;
    bankName?: string;
  };
  step5?: {
    termsAccepted?: boolean;
    privacyPolicyAccepted?: boolean;
    marketingConsent?: boolean;
  };
  portfolioItems?: any[];
  faqs?: any[];
  portfolio?: any[];
  profilePictureURL?: string;
  identityFrontUrl?: string;
  identityBackUrl?: string;
  paymentTermsSettings?: {
    defaultPaymentTerms?: {
      days: number;
      text: string;
      skontoEnabled?: boolean;
      skontoDays?: number;
      skontoPercentage?: number;
    };
    customTerms?: string;
    allowedPaymentMethods?: string[];
    lateFeePercentage?: number;
    earlyPaymentDiscount?: number;
  };
  defaultPaymentTerms?: {
    days: number;
    text: string;
    skontoEnabled?: boolean;
    skontoDays?: number;
    skontoPercentage?: number;
  };
  logoUrl?: string;
  documentTemplates?: {
    invoiceTemplate?: string;
    quoteTemplate?: string;
    deliveryNoteTemplate?: string;
  };
  stornoSettings?: {
    allowCancellation?: boolean;
    cancellationFee?: number;
    cancellationTimeLimit?: number;
    refundPolicy?: string;
  };
}

export interface UserDataForSettings {
  uid: string;
  companyName?: string;
  email?: string;
  displayName?: string;
  legalForm?: string; // Rechtsform des Unternehmens
  lat?: number;
  lng?: number;
  radiusKm?: number;
  profileBannerImage?: string;
  profilePictureURL?: string;
  // Tasker Profile fields (Root-Level access)
  bio?: string;
  selectedCategory?: string;
  selectedSubcategory?: string;
  skills?: string[];
  hourlyRate?: number;
  location?: string;
  offersVideoConsultation?: boolean;
  level?: number;
  isTopRated?: boolean;
  step1?: {
    personalData?: {
      gender?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      dateOfBirth?: string;
      placeOfBirth?: string;
      nationality?: string;
      address?: {
        street?: string;
        houseNumber?: string;
        postalCode?: string;
        city?: string;
        country?: string;
      };
    };
    educationData?: {
      degree?: string;
      university?: string;
      graduationYear?: string;
      additionalCertifications?: string;
    };
    professionalData?: {
      jobTitle?: string;
      experience?: string;
      skills?: string;
      portfolio?: string;
      references?: string;
    };
    personalStreet?: string;
    firstName?: string;
    lastName?: string;
    personalPostalCode?: string;
    phoneNumber?: string;
    email?: string;
  };
  step2?: {
    companyName?: string;
    companySuffix?: string;
    companyAddress?: {
      street?: string;
      houseNumber?: string;
      postalCode?: string;
      city?: string;
      country?: string;
    };
    address?: string;
    street?: string;
    postalCode?: string;
    city?: string;
    companyPhone?: string;
    companyPhoneNumber?: string;
    companyEmail?: string;
    companyWebsite?: string;
    fax?: string;
    website?: string;
    languages?: string;
    industry?: string;
    employees?: string;
    taxId?: string;
    vatId?: string;
    commercialRegisterNumber?: string;
    legalForm?: string;
    foundingDate?: string;
    hauptberuflich?: boolean | string;
    numberOfEmployees?: string;
    businessDescription?: string;
    categories?: string[];
    subcategories?: string[];
  };
  step3?: {
    bankDetails?: {
      bankName?: string;
      iban?: string;
      bic?: string;
      accountHolder?: string;
    };
    preferredPaymentMethods?: string[];
    paymentTerms?: string;
    hourlyRate?: number;
    fixedPrices?: { [key: string]: number };
    ust?: string;
    profitMethod?: string;
    priceInput?: string;
    vatId?: string;
    taxNumber?: string;
    lastInvoiceNumber?: string;
    districtCourt?: string;
    companyRegister?: string;
    taxMethod?: string;
    defaultTaxRate?: string;
    accountingSystem?: string;
    finanzamt?: string;
    bundesland?: string;
    faqs?: any[];
    portfolio?: any[];
    profilePictureURL?: string;
    profileBannerImage?: string;
    identityFrontUrl?: string;
    identityBackUrl?: string;
    // Tasker Profile fields
    bio?: string;
    selectedCategory?: string;
    selectedSubcategory?: string;
    skills?: string[];
    location?: string;
    offersVideoConsultation?: boolean;
    level?: number;
    isTopRated?: boolean;
  };
  step4?: {
    businessLicense?: string;
    insurancePolicy?: string;
    certifications?: string[];
    additionalDocuments?: string[];
    accountHolder?: string;
    iban?: string;
    bic?: string;
    bankName?: string;
  };
  step5?: {
    termsAccepted?: boolean;
    privacyPolicyAccepted?: boolean;
    marketingConsent?: boolean;
  };
  portfolioItems?: any[];
  faqs?: any[];
  portfolio?: any[];
  identityFrontUrl?: string;
  identityBackUrl?: string;
  paymentTermsSettings?: {
    defaultPaymentTerms?: {
      days: number;
      text: string;
      skontoEnabled?: boolean;
      skontoDays?: number;
      skontoPercentage?: number;
    };
    customTerms?: string;
    allowedPaymentMethods?: string[];
    lateFeePercentage?: number;
    earlyPaymentDiscount?: number;
  };
  logoUrl?: string;
  documentTemplates?: {
    invoiceTemplate?: string;
    quoteTemplate?: string;
    deliveryNoteTemplate?: string;
  };
  stornoSettings?: {
    allowCancellation?: boolean;
    cancellationFee?: number;
    cancellationTimeLimit?: number;
    refundPolicy?: string;
  };
  serviceItems?: any[];
}
