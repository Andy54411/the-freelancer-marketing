// src/components/templates/adapters/invoiceDataAdapter.ts

import { InvoiceData } from '@/types/invoiceTypes';

// Typdefinition für das Template-Format
export interface TemplateAddress {
  street: string;
  zipCode: string;
  city: string;
  country: string;
}

export interface TemplateCustomer {
  name: string;
  email: string;
  address: TemplateAddress;
}

export interface TemplateBankDetails {
  iban: string;
  bic: string;
  accountHolder: string;
}

export interface TemplateCompany {
  name: string;
  email: string;
  phone: string;
  address: TemplateAddress;
  taxNumber: string;
  vatId: string;
  bankDetails: TemplateBankDetails;
}

export interface TemplateLineItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface TemplateInvoiceData {
  documentNumber: string;
  date: string;
  dueDate: string;
  serviceDate?: string;
  servicePeriod?: string;
  customer: TemplateCustomer;
  company: TemplateCompany;
  items: TemplateLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paymentTerms: string;
  notes?: string;
  reverseCharge?: boolean;
}

/**
 * Hilfs-Funktion zum Parsen einer Adresszeile
 */
function parseAddress(address: string | undefined): TemplateAddress {
  const lines = (address || '').split('\n');
  return {
    street: lines[0] || '',
    zipCode: lines[1]?.split(' ')[0] || '',
    city: lines[1]?.split(' ').slice(1).join(' ') || '',
    country: lines[2] || 'Deutschland'
  };
}

/**
 * Konvertiert die zentrale InvoiceData in das Template-Format
 */
export function adaptInvoiceDataToTemplate(data: InvoiceData): TemplateInvoiceData {
  const customerAddress = parseAddress(data.customerAddress);
  const companyAddress = parseAddress(data.companyAddress);

  const templateData: TemplateInvoiceData = {
    documentNumber: data.invoiceNumber || data.number,
    date: data.date,
    dueDate: data.dueDate,
    serviceDate: undefined, // Optional für spätere Erweiterung
    servicePeriod: undefined, // Optional für spätere Erweiterung
    customer: {
      name: data.customerName,
      email: data.customerEmail || '',
      address: customerAddress
    },
    company: {
      name: data.companyName || '',
      email: data.companyEmail || '',
      phone: data.companyPhone || '',
      address: companyAddress,
      taxNumber: data.companyTaxNumber || '',
      vatId: data.companyVatId || '',
      bankDetails: {
        iban: data.bankDetails?.iban || '',
        bic: data.bankDetails?.bic || '',
        accountHolder: data.bankDetails?.accountHolder || ''
      }
    },
    items: (data.items || []).map(item => ({
      description: item.description,
      quantity: item.quantity,
      unit: 'Stk.',
      unitPrice: item.unitPrice,
      total: item.total
    })),
    subtotal: data.items?.reduce((sum, item) => sum + item.total, 0) || 0,
    taxRate: Number(data.vatRate || 19),
    taxAmount: data.tax || 0,
    total: data.total || 0,
    paymentTerms: `Zahlbar bis ${new Date(data.dueDate).toLocaleDateString('de-DE')}`,
    notes: data.notes || '',
    reverseCharge: false
  };

  return templateData;
}