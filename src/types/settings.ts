// Types für Settings - extrahiert aus SettingsComponent
export interface RawFirestoreUserData {
  uid: string;
  companyName?: string;
  email?: string;
  displayName?: string;
  profileBannerImage?: string;
  taxNumber?: string;
  taxNumberForBackend?: string;
  vatId?: string;
  vatIdForBackend?: string;
  iban?: string;
  accountHolder?: string;
  profilePictureFirebaseUrl?: string;
  identityFrontUrlStripeId?: string;
  identityBackUrlStripeId?: string;
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
    companyAddress?: {
      street?: string;
      houseNumber?: string;
      postalCode?: string;
      city?: string;
      country?: string;
    };
    companyPhone?: string;
    companyEmail?: string;
    companyWebsite?: string;
    taxId?: string;
    vatId?: string;
    commercialRegisterNumber?: string;
    districtCourt?: string;
    companyRegister?: string;
    legalForm?: string;
    foundingDate?: string;
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
    faqs?: any[];
    portfolio?: any[];
    profilePictureURL?: string;
    profileBannerImage?: string;
    identityFrontUrl?: string;
    identityBackUrl?: string;
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
    faqs?: any[];
    portfolio?: any[];
    profilePictureURL?: string;
    profileBannerImage?: string;
    identityFrontUrl?: string;
    identityBackUrl?: string;
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
