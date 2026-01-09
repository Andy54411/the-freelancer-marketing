/**
 * WhatsApp Variable Replacer
 * 
 * Ersetzt Platzhalter in WhatsApp-Templates mit echten Daten
 */

import { db } from '@/firebase/server';

interface CompanyData {
  name?: string;
  email?: string;
  phone?: string;
  ownerName?: string;
}

interface CustomerData {
  name?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  email?: string;
  phone?: string;
}

interface InvoiceData {
  invoiceNumber?: string;
  number?: string;
  documentDate?: string;
  dueDate?: string;
  totalAmount?: number;
  netAmount?: number;
}

interface AppointmentData {
  title?: string;
  date?: string;
  time?: string;
  endTime?: string;
  location?: string;
  description?: string;
}

interface QuoteData {
  quoteNumber?: string;
  number?: string;
  documentDate?: string;
  validUntil?: string;
  totalAmount?: number;
  netAmount?: number;
}

interface VariableContext {
  companyId: string;
  customerId?: string;
  invoiceId?: string;
  quoteId?: string;
  appointmentId?: string;
  companyData?: CompanyData;
  customerData?: CustomerData;
  invoiceData?: InvoiceData;
  appointmentData?: AppointmentData;
  quoteData?: QuoteData;
  additionalData?: Record<string, string>;
}

/**
 * Formatiert Datum zu deutschem Format (DD.MM.YYYY)
 */
function formatDate(date: Date | string | { seconds: number; nanoseconds: number } | undefined): string {
  if (!date) return '';
  
  let dateObj: Date;
  
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else if (date instanceof Date) {
    dateObj = date;
  } else if ('seconds' in date) {
    dateObj = new Date(date.seconds * 1000);
  } else {
    return '';
  }
  
  return dateObj.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formatiert Betrag zu deutschem Format (1.234,56 €)
 */
function formatAmount(amount: number | undefined): string {
  if (amount === undefined || amount === null) return '';
  
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/**
 * Lädt Firmendaten aus Firestore
 */
async function loadCompanyData(companyId: string): Promise<CompanyData> {
  if (!db) throw new Error('Firebase nicht verfügbar');
  
  const companyDoc = await db.collection('companies').doc(companyId).get();
  
  if (!companyDoc.exists) {
    return {};
  }
  
  const data = companyDoc.data();
  
  return {
    name: data?.name || data?.companyName || '',
    email: data?.email || '',
    phone: data?.phone || data?.phoneNumber || '',
    ownerName: data?.ownerName || data?.firstName && data?.lastName 
      ? `${data.firstName} ${data.lastName}`.trim() 
      : '',
  };
}

/**
 * Lädt Kundendaten aus Firestore
 */
async function loadCustomerData(companyId: string, customerId: string): Promise<CustomerData> {
  if (!db) throw new Error('Firebase nicht verfügbar');
  
  const customerDoc = await db
    .collection('companies')
    .doc(companyId)
    .collection('customers')
    .doc(customerId)
    .get();
  
  if (!customerDoc.exists) {
    return {};
  }
  
  const data = customerDoc.data();
  
  return {
    name: data?.name || data?.companyName || 
      (data?.firstName && data?.lastName ? `${data.firstName} ${data.lastName}`.trim() : ''),
    firstName: data?.firstName || '',
    lastName: data?.lastName || '',
    company: data?.company || data?.companyName || '',
    email: data?.email || '',
    phone: data?.phone || data?.phoneNumber || '',
  };
}

/**
 * Lädt Rechnungsdaten aus Firestore
 */
async function loadInvoiceData(companyId: string, invoiceId: string): Promise<InvoiceData> {
  if (!db) throw new Error('Firebase nicht verfügbar');
  
  const invoiceDoc = await db
    .collection('companies')
    .doc(companyId)
    .collection('invoices')
    .doc(invoiceId)
    .get();
  
  if (!invoiceDoc.exists) {
    return {};
  }
  
  const data = invoiceDoc.data();
  
  return {
    invoiceNumber: data?.invoiceNumber || data?.number || '',
    number: data?.invoiceNumber || data?.number || '',
    documentDate: data?.createdAt || data?.invoiceDate || '',
    dueDate: data?.dueDate || '',
    totalAmount: data?.totalAmount || 0,
    netAmount: data?.netAmount || data?.subtotal || 0,
  };
}

/**
 * Ersetzt alle Variablen im Text mit echten Daten
 */
export async function replaceWhatsAppVariables(
  text: string,
  context: VariableContext
): Promise<string> {
  let result = text;
  
  // Lade benötigte Daten
  const companyData = context.companyData || await loadCompanyData(context.companyId);
  
  let customerData: CustomerData = {};
  if (context.customerId) {
    customerData = context.customerData || await loadCustomerData(context.companyId, context.customerId);
  }
  
  let invoiceData: InvoiceData = {};
  if (context.invoiceId) {
    invoiceData = context.invoiceData || await loadInvoiceData(context.companyId, context.invoiceId);
  }
  
  // Termin-Daten (wenn vorhanden)
  const appointmentData = context.appointmentData || {};
  
  // Angebots-Daten (wenn vorhanden)
  const quoteData = context.quoteData || {};
  
  // Variablen-Mapping
  const replacements: Record<string, string> = {
    // Kunde
    '[%KUNDENNAME%]': customerData.name || '',
    '[%VORNAME%]': customerData.firstName || '',
    '[%NACHNAME%]': customerData.lastName || '',
    '[%KUNDENFIRMA%]': customerData.company || '',
    '[%KUNDENTELEFON%]': customerData.phone || '',
    '[%KUNDENEMAIL%]': customerData.email || '',
    
    // Firma
    '[%FIRMENNAME%]': companyData.name || '',
    '[%FIRMENEMAIL%]': companyData.email || '',
    '[%FIRMENTELEFON%]': companyData.phone || '',
    '[%KONTAKTPERSON%]': companyData.ownerName || '',
    
    // Rechnung/Dokument
    '[%RECHNUNGSNUMMER%]': invoiceData.invoiceNumber || '',
    '[%DOKUMENTDATUM%]': formatDate(invoiceData.documentDate),
    '[%FAELLIGKEITSDATUM%]': formatDate(invoiceData.dueDate),
    
    // Beträge
    '[%GESAMTSUMME%]': formatAmount(invoiceData.totalAmount),
    '[%NETTOBETRAG%]': formatAmount(invoiceData.netAmount),
    
    // Termin
    '[%TERMINTITEL%]': appointmentData.title || '',
    '[%TERMINDATUM%]': appointmentData.date || '',
    '[%TERMINUHRZEIT%]': appointmentData.time || '',
    '[%TERMINENDE%]': appointmentData.endTime || '',
    '[%TERMINORT%]': appointmentData.location || '',
    '[%TERMINBESCHREIBUNG%]': appointmentData.description || '',
    
    // Angebot
    '[%ANGEBOTSNUMMER%]': quoteData.quoteNumber || quoteData.number || '',
    '[%ANGEBOTSDATUM%]': formatDate(quoteData.documentDate),
    '[%GUELTIGBIS%]': formatDate(quoteData.validUntil),
    '[%ANGEBOTSSUMME%]': formatAmount(quoteData.totalAmount),
    '[%ANGEBOTSNETTO%]': formatAmount(quoteData.netAmount),
    
    // Zusätzliche Daten
    ...context.additionalData,
  };
  
  // Ersetze alle Platzhalter
  Object.entries(replacements).forEach(([placeholder, value]) => {
    result = result.split(placeholder).join(value);
  });
  
  return result;
}

/**
 * Prüft, ob ein Text Platzhalter enthält
 */
export function hasPlaceholders(text: string): boolean {
  const placeholderPattern = /\[%[A-Z_]+%\]/;
  return placeholderPattern.test(text);
}

/**
 * Extrahiert alle Platzhalter aus einem Text
 */
export function extractPlaceholders(text: string): string[] {
  const placeholderPattern = /\[%[A-Z_]+%\]/g;
  const matches = text.match(placeholderPattern) || [];
  return [...new Set(matches)];
}

/**
 * Validiert, ob alle erforderlichen Daten für die Platzhalter verfügbar sind
 */
export function validatePlaceholderData(
  text: string,
  context: VariableContext
): { valid: boolean; missing: string[] } {
  const placeholders = extractPlaceholders(text);
  const missing: string[] = [];
  
  placeholders.forEach(placeholder => {
    // Kunde-Platzhalter benötigen customerId
    if (
      [
        '[%KUNDENNAME%]',
        '[%VORNAME%]',
        '[%NACHNAME%]',
        '[%KUNDENFIRMA%]',
        '[%KUNDENTELEFON%]',
        '[%KUNDENEMAIL%]',
      ].includes(placeholder)
    ) {
      if (!context.customerId && !context.customerData) {
        missing.push('Kundendaten fehlen');
      }
    }
    
    // Rechnung-Platzhalter benötigen invoiceId
    if (
      [
        '[%RECHNUNGSNUMMER%]',
        '[%DOKUMENTDATUM%]',
        '[%FAELLIGKEITSDATUM%]',
        '[%GESAMTSUMME%]',
        '[%NETTOBETRAG%]',
      ].includes(placeholder)
    ) {
      if (!context.invoiceId && !context.invoiceData) {
        missing.push('Rechnungsdaten fehlen');
      }
    }
  });
  
  return {
    valid: missing.length === 0,
    missing: [...new Set(missing)],
  };
}
