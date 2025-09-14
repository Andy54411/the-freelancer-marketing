// Template Types
export interface TemplateProps {
  data: DocumentData;
  companySettings?: CompanySettings;
  customizations?: TemplateCustomizations;
}

export interface DocumentData {
  documentNumber: string;
  date: string;
  validUntil?: string;
  title?: string;
  reference?: string;
  customerName: string;
  customerEmail?: string;
  customerAddress?: Address;
  customerContact?: string;
  items?: LineItem[];
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  total?: number;
  currency?: string;
  taxRule?: string;
  taxRuleLabel?: string;
  isSmallBusiness?: boolean;
  headTextHtml?: string;
  footerText?: string;
  notes?: string;
  createdBy?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  internalContactPerson?: string;
}

export interface Address {
  street: string;
  zipCode: string;
  city: string;
  country?: string;
}

export interface LineItem {
  description: string;
  details?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  discountPercent?: number;
  category?: string;
}

export interface CompanySettings {
  companyName?: string;
  logoUrl?: string;
  address?: Address;
  contactInfo?: ContactInfo;
  taxId?: string;
  vatId?: string;
  bankDetails?: BankDetails;
  management?: string;
  commercialRegister?: string;
}

export interface ContactInfo {
  phone?: string;
  email?: string;
  website?: string;
}

export interface BankDetails {
  iban?: string;
  bic?: string;
  bankName?: string;
}

export interface TemplateCustomizations {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  showLogo?: boolean;
  showTaxId?: boolean;
}
