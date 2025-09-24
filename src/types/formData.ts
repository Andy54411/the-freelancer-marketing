import { TaxRuleType } from './taxRules';

export interface CreateInvoiceFormData {
  // Rechnungsdetails
  title: string;
  invoiceDate: string;
  validUntil: string;
  deliveryDate?: string;
  customerOrderNumber?: string;

  // Kundendaten
  customerName: string;
  customerEmail: string;
  customerAddress?: string;

  // Währung und Steuer
  currency: string;
  taxRule: TaxRuleType;

  // Texte
  headTextHtml: string;
  footerText: string;
  notes: string;
  internalContactPerson: string;

  // Lieferung und Zahlung
  deliveryTerms: string;
  paymentTerms: string;
}