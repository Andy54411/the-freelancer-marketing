// Shared types and interfaces for invoice templates
export type InvoiceTemplate =
  | 'german-standard'
  | 'modern-business'
  | 'classic-professional'
  | 'minimal-clean'
  | 'corporate-formal';

export interface InvoiceData {
  id: string;
  number: string;
  invoiceNumber: string;
  sequentialNumber: number;
  date: string;
  issueDate: string;
  dueDate: string;
  customerName: string;
  customerAddress: string;
  customerEmail?: string;
  description?: string;
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  companyWebsite?: string;
  companyLogo?: string;
  companyVatId?: string;
  companyTaxNumber?: string;
  companyRegister?: string;
  districtCourt?: string;
  legalForm?: string;
  companyTax?: string;
  iban?: string;
  accountHolder?: string;
  items: InvoiceItem[];
  amount: number;
  tax: number;
  total: number;
  isSmallBusiness: boolean;
  vatRate: number;
  priceInput: 'netto' | 'brutto';
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'storno' | 'finalized';
  isStorno?: boolean;
  originalInvoiceId?: string;
  stornoReason?: string;
  stornoDate?: Date;
  stornoBy?: string;

  // Template-spezifische Felder
  paymentTerms?: string;
  bankDetails?: {
    iban: string;
    bic?: string;
    accountHolder: string;
    bankName?: string;
  };
  notes?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  taxRate?: number; // MwSt-Satz für diesen Artikel
}

export interface InvoiceTemplateProps {
  data: InvoiceData;
  preview?: boolean;
}

export interface TemplateMetadata {
  id: InvoiceTemplate;
  name: string;
  description: string;
  features: string[];
  category: 'standard' | 'business' | 'creative' | 'formal';
  suitable_for: string[];
}

// Utility functions
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-DE');
};

// Default template
export const DEFAULT_INVOICE_TEMPLATE: InvoiceTemplate = 'german-standard';
