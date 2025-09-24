import { CompanySettings } from '../types';

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

export interface Company {
  name?: string;
  address?: Address;
  email?: string;
  phone?: string;
  vatId?: string;
  taxNumber?: string;
  registrationNumber?: string;
  bankDetails?: BankDetails;
}

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  discountPercent: number;
  discount: number;
  taxRate: number;
  total: number;
}

export type TaxRuleType = 
  | 'DE_REVERSE_13B' 
  | 'DE_TAXABLE' 
  | 'DE_REDUCED' 
  | 'DE_NOTAXABLE' 
  | 'DE_EXEMPT_4_USTG' 
  | 'EU_REVERSE_CHARGE' 
  | 'EU_OSS' 
  | 'NON_EU';

export type TaxRule = TaxRuleType;

export interface InvoiceData {
  // Dokumentinformationen
  documentNumber: string;
  invoiceNumber?: string;
  date: string;
  dueDate?: string;
  currency?: string;
  reference?: string;

  // Leistungszeitraum
  serviceDate?: string;
  servicePeriod?: string;

  // Kundendaten
  customerName: string;
  customerAddress?: Address;
  contactPersonName?: string;

  // Texte
  description?: string;
  introText?: string;
  headerText?: string;
  footerText?: string;

  // Zahlungsbedingungen
  paymentTerms?: string;
  manualPaymentTerms?: string;
  deliveryTerms?: string;
  skontoText?: string;
  skontoDays?: number;
  skontoPercentage?: number;

  // Steuerrelevante Informationen
  taxRule?: TaxRule;
  taxRate?: number;
  taxAmount?: number;
  reverseCharge?: boolean;
  isSmallBusiness?: boolean;

  // Positionen und Summen
  items: InvoiceItem[];
  subtotal: number;
  total: number;

  // Unternehmensdaten
  company?: Company;
}

export interface TemplateProps {
  data: InvoiceData;
  companySettings?: CompanySettings;
  customizations?: {
    showLogo?: boolean;
    logoUrl?: string;
    primaryColor?: string;
    fontFamily?: string;
    customFooterText?: string;
  };
}