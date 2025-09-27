export interface Address {
  street: string;
  zipCode: string;
  city: string;
  country?: string;
}

export interface BankDetails {
  iban: string;
  bic: string;
  accountHolder: string;
  bankName?: string;
}

export interface CompanySettings {
  name?: string;
  address?: Address;
  email?: string;
  phone?: string;
  vatId?: string;
  taxNumber?: string;
  registrationNumber?: string;
  bankDetails?: BankDetails;
  logo?: string;
  logoUrl?: string;
}

export interface TemplateCustomizations {
  showLogo?: boolean;
  logoUrl?: string;
  primaryColor?: string;
  fontFamily?: string;
  customFooterText?: string;
}
