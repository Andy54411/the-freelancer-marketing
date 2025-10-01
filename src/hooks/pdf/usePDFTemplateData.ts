'use client';

import { useMemo } from 'react';
import { InvoiceData } from '@/types/invoiceTypes';
import { formatCurrency, formatDate } from '@/lib/utils';

export interface PDFTemplateProps {
  document: InvoiceData;
  template: string;
  color: string;
  logoUrl?: string | null;
  logoSize?: number;
  documentType: 'invoice' | 'quote' | 'reminder';
  pageMode?: 'single' | 'multi';
}

export interface ParsedAddress {
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface ProcessedPDFData {
  // Document labels
  documentLabel: string;

  // Calculated values
  realItems: any[];
  vatRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;

  // Document identification
  companyName: string;
  customerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  sequentialNumber: string;

  // Customer data
  customerAddress: string;
  customerAddressParsed: ParsedAddress;
  customerEmail: string;
  customerPhone: string;
  customerNumber: string;
  customerOrderNumber: string;
  customerFirstName: string;
  customerLastName: string;
  customerTaxNumber: string;
  customerVatId: string;

  // Company data
  companyAddress: string;
  companyAddressParsed: ParsedAddress;
  companyEmail: string;
  companyPhone: string;
  companyWebsite: string;
  companyVatId: string;
  companyTaxNumber: string;
  companyRegister: string;

  // Content fields
  headTextHtml: string;
  description: string;
  introText: string;
  headerText: string;
  footerText: string;
  notes: string;
  hinweise: string;
  additionalNotes: string;
  conclusionText: string;
  paymentTerms: string;
  deliveryDate: string;
  servicePeriod: string;
  internalContactPerson: string;
  contactPersonName: string;

  // Tax settings
  isSmallBusiness: boolean;
  priceInput: string;
  taxRuleType: string;
  taxRule: string;
  showNet: boolean;

  // Tax breakdown (SevDesk-style grouped by tax rate)
  taxGrouped: Array<{
    rate: number;
    netAmount: number;
    taxAmount: number;
  }>;

  // Skonto settings
  skontoEnabled: boolean;
  skontoDays: number;
  skontoPercentage: number;
  skontoText: string;

  // E-Invoice data
  eInvoice: any;
  eInvoiceData: any;

  // Status and metadata
  status: string;
  currency: string;
  language: string;
  createdBy: string;
  deliveryTerms: string;

  // Logo and branding
  companyLogo: string;

  // Bank details
  bankDetails: any;
}

export const usePDFTemplateData = ({
  document,
  template,
  color,
  logoUrl,
  logoSize = 50,
  documentType,
}: PDFTemplateProps): ProcessedPDFData => {
  return useMemo(() => {
    // Document labels
    const documentLabels = {
      invoice: 'Rechnung',
      quote: 'Angebot',
      reminder: 'Mahnung',
    };
    const documentLabel = documentLabels[documentType];

    // Calculate items and totals
    const realItems = document.items || [];
    const vatRate = document.vatRate || (document as any).taxRate || 19;

    const subtotal = realItems.reduce((sum, item) => {
      const discountPercent = (item as any).discountPercent || 0;
      const originalTotal = item.total || item.unitPrice * item.quantity;
      const discountedTotal =
        discountPercent > 0 ? originalTotal * (1 - discountPercent / 100) : originalTotal;
      return sum + discountedTotal;
    }, 0);

    const taxAmount = subtotal * (vatRate / 100);
    const total = subtotal + taxAmount;

    // SevDesk-style tax grouping: Group items by tax rate
    const taxGroups: { [rate: number]: { netAmount: number; taxAmount: number } } = {};

    realItems.forEach(item => {
      const itemTaxRate = (item as any).taxRate || vatRate || 19;
      const discountPercent = (item as any).discountPercent || 0;
      const originalTotal = item.total || item.unitPrice * item.quantity;
      const netAmount =
        discountPercent > 0 ? originalTotal * (1 - discountPercent / 100) : originalTotal;
      const itemTaxAmount = netAmount * (itemTaxRate / 100);

      if (!taxGroups[itemTaxRate]) {
        taxGroups[itemTaxRate] = { netAmount: 0, taxAmount: 0 };
      }

      taxGroups[itemTaxRate].netAmount += netAmount;
      taxGroups[itemTaxRate].taxAmount += itemTaxAmount;
    });

    // Convert to array format like SevDesk
    const taxGrouped = Object.entries(taxGroups)
      .map(([rate, amounts]) => ({
        rate: Number(rate),
        netAmount: Math.round(amounts.netAmount * 100) / 100,
        taxAmount: Math.round(amounts.taxAmount * 100) / 100,
      }))
      .sort((a, b) => b.rate - a.rate); // Sort descending (19%, 7%, 0%)

    // Document identification
    const companyName = document.companyName || 'Ihr Unternehmen';
    const customerName = document.customerName || 'Kunde';
    const invoiceNumber =
      document.invoiceNumber ||
      document.number ||
      document.documentNumber ||
      (document as any).title ||
      '';
    const invoiceDate = document.date || document.issueDate || (document as any).invoiceDate || '';
    const dueDate = document.dueDate || (document as any).validUntil || '';
    const sequentialNumber = (document as any).sequentialNumber || '';

    // Customer data
    const customerAddress = document.customerAddress || '';
    const customerEmail = document.customerEmail || '';
    const customerPhone = (document as any).customerPhone || '';
    const customerNumber = (document as any).customerNumber || '';
    const customerOrderNumber = (document as any).customerOrderNumber || '';
    const customerFirstName = (document as any).customerFirstName || '';
    const customerLastName = (document as any).customerLastName || '';
    const customerTaxNumber = (document as any).customerTaxNumber || '';
    const customerVatId = (document as any).customerVatId || '';

    // Company data
    const companyAddress = document.companyAddress || '';
    const companyEmail = document.companyEmail || '';
    const companyPhone = document.companyPhone || '';
    const companyWebsite = document.companyWebsite || '';
    const companyVatId = document.companyVatId || '';
    const companyTaxNumber = document.companyTaxNumber || '';
    const companyRegister = (document as any).companyRegister || '';

    // Content fields
    const headTextHtml = (document as any).headTextHtml || '';
    const description = document.description || '';
    const introText = (document as any).introText || '';
    const headerText = (document as any).headerText || '';
    const footerText = (document as any).footerText || '';
    const notes = (document as any).notes || '';
    const hinweise = (document as any).hinweise || '';
    const additionalNotes = (document as any).additionalNotes || '';
    const conclusionText = (document as any).conclusionText || '';
    const paymentTerms = document.paymentTerms || (document as any).paymentTerms || '14 Tage';
    const deliveryDate = (document as any).deliveryDate || '';
    const servicePeriod = (document as any).servicePeriod || '';
    const internalContactPerson = (document as any).internalContactPerson || '';
    const contactPersonName = (document as any).contactPersonName || '';

    // Tax settings
    const isSmallBusiness = document.isSmallBusiness || false;
    const priceInput = (document as any).priceInput || 'netto';
    const taxRuleType = (document as any).taxRuleType || '';
    const taxRule = document.taxRule || document.taxRuleType || (document as any).taxRule || '';
    const showNet = (document as any).showNet || true;

    // Skonto settings
    const skontoEnabled = document.skontoEnabled || (document as any).skontoEnabled || false;
    const skontoDays = document.skontoDays || (document as any).skontoDays || 0;
    const skontoPercentage = document.skontoPercentage || (document as any).skontoPercentage || 0;
    const skontoText = document.skontoText || (document as any).skontoText || '';

    // E-Invoice data
    const eInvoice = document.eInvoice || (document as any).eInvoice;
    const eInvoiceData = document.eInvoiceData || (document as any).eInvoiceData;

    // Status and metadata
    const status = (document as any).status || '';
    const currency = document.currency || (document as any).currency || 'EUR';
    const language = (document as any).language || 'de';
    const createdBy = (document as any).createdBy || '';
    const deliveryTerms = document.deliveryTerms || (document as any).deliveryTerms || '';

    // Logo and branding
    const companyLogo =
      logoUrl ||
      document.companyLogo ||
      (document as any).profilePictureURL ||
      (document as any).profilePictureFirebaseUrl ||
      'https://storage.googleapis.com/tilvo-f142f-storage/user_uploads%2FLLc8PX1VYHfpoFknk8o51LAOfSA2%2Fbusiness_icon_363787a5-842e-4841-8d71-e692082312fa_Gemini_Generated_Image_xzose0xzose0xzos.jpg';

    // Bank details
    const bankDetails = document.bankDetails || {};

    // Parse addresses
    const parseAddress = (address: string): ParsedAddress => {
      if (!address) return { street: '', city: '', postalCode: '', country: '' };
      const lines = address.split('\n');
      const streetLine = lines[0] || '';
      const cityLine = lines[1] || '';
      const countryLine = lines[2] || '';

      const cityParts = cityLine.split(' ');
      const postalCode = cityParts[0] || '';
      const city = cityParts.slice(1).join(' ') || '';

      return {
        street: streetLine,
        postalCode,
        city,
        country: countryLine || 'Deutschland',
      };
    };

    const customerAddressParsed = parseAddress(customerAddress);
    const companyAddressParsed = parseAddress(companyAddress);

    return {
      documentLabel,
      realItems,
      vatRate,
      subtotal,
      taxAmount,
      total,
      companyName,
      customerName,
      invoiceNumber,
      invoiceDate,
      dueDate,
      sequentialNumber,
      customerAddress,
      customerAddressParsed,
      customerEmail,
      customerPhone,
      customerNumber,
      customerOrderNumber,
      customerFirstName,
      customerLastName,
      customerTaxNumber,
      customerVatId,
      companyAddress,
      companyAddressParsed,
      companyEmail,
      companyPhone,
      companyWebsite,
      companyVatId,
      companyTaxNumber,
      companyRegister,
      headTextHtml,
      description,
      introText,
      headerText,
      footerText,
      notes,
      hinweise,
      additionalNotes,
      conclusionText,
      paymentTerms,
      deliveryDate,
      servicePeriod,
      internalContactPerson,
      contactPersonName,
      isSmallBusiness,
      priceInput,
      taxRuleType,
      taxRule,
      showNet,
      taxGrouped,
      skontoEnabled,
      skontoDays,
      skontoPercentage,
      skontoText,
      eInvoice,
      eInvoiceData,
      status,
      currency,
      language,
      createdBy,
      deliveryTerms,
      companyLogo,
      bankDetails,
    };
  }, [document, template, color, logoUrl, logoSize, documentType]);
};
