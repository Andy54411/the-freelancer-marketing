// Platzhalter-System für Textvorlagen

interface PlaceholderData {
  // Firmen-Informationen
  companyName?: string;
  companyStreet?: string;
  companyCity?: string;
  companyPostalCode?: string;
  companyCountry?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  companyTaxNumber?: string;
  companyVatId?: string;
  companyRegistrationNumber?: string;
  companyIban?: string;
  companyBic?: string;

  // Kunden-Informationen
  customerName?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerStreet?: string;
  customerCity?: string;
  customerPostalCode?: string;
  customerCountry?: string;
  customerPhone?: string;

  // Dokument-Informationen
  documentNumber?: string;
  invoiceNumber?: string;
  quoteNumber?: string;
  documentDate?: string;
  dueDate?: string;
  serviceDate?: string;
  servicePeriod?: string;

  // Beträge
  totalAmount?: number;
  subtotalAmount?: number;
  taxAmount?: number;
  netAmount?: number;

  // Zahlungskonditionen
  paymentTerms?: string;
  skontoText?: string;

  // Projektinformationen
  projectTitle?: string;
  projectDescription?: string;

  // Zeitraum
  currentDate?: string;
  currentYear?: string;
  currentMonth?: string;
}

export function replacePlaceholders(text: string, data: PlaceholderData): string {
  if (!text) return '';

  let result = text;

  // Firmen-Platzhalter
  if (data.companyName) result = result.replace(/\[%FIRMENNAME%\]/g, data.companyName);
  if (data.companyStreet) result = result.replace(/\[%FIRMENSTRASSE%\]/g, data.companyStreet);
  if (data.companyCity) result = result.replace(/\[%FIRMENORT%\]/g, data.companyCity);
  if (data.companyPostalCode) result = result.replace(/\[%FIRMENPLZ%\]/g, data.companyPostalCode);
  if (data.companyCountry) result = result.replace(/\[%FIRMENLAND%\]/g, data.companyCountry);
  if (data.companyPhone) result = result.replace(/\[%FIRMENTELEFON%\]/g, data.companyPhone);
  if (data.companyEmail) result = result.replace(/\[%FIRMENEMAIL%\]/g, data.companyEmail);
  if (data.companyWebsite) result = result.replace(/\[%FIRMENWEBSITE%\]/g, data.companyWebsite);
  if (data.companyTaxNumber) result = result.replace(/\[%STEUERNUMMER%\]/g, data.companyTaxNumber);
  if (data.companyVatId) result = result.replace(/\[%USTIDNR%\]/g, data.companyVatId);
  if (data.companyRegistrationNumber)
    result = result.replace(/\[%HANDELSREGISTERNUMMER%\]/g, data.companyRegistrationNumber);
  if (data.companyIban) result = result.replace(/\[%IBAN%\]/g, data.companyIban);
  if (data.companyBic) result = result.replace(/\[%BIC%\]/g, data.companyBic);

  // Kunden-Platzhalter
  if (data.customerName) {
    result = result.replace(/\[%KUNDENNAME%\]/g, data.customerName);
    // Anrede generieren
    const anrede =
      data.customerName.includes('GmbH') ||
      data.customerName.includes('AG') ||
      data.customerName.includes('UG')
        ? 'Sehr geehrte Damen und Herren'
        : `Sehr geehrte${data.customerName.toLowerCase().includes('frau') ? ' Frau' : data.customerName.toLowerCase().includes('herr') ? ' Herr' : ' Damen und Herren'}`;
    result = result.replace(/\[%ANREDE%\]/g, anrede);
    result = result.replace(/\[%VOLLEANREDE%\]/g, `${anrede},`);
  }
  if (data.customerEmail) result = result.replace(/\[%KUNDENEMAIL%\]/g, data.customerEmail);
  if (data.customerAddress) result = result.replace(/\[%KUNDENADRESSE%\]/g, data.customerAddress);
  if (data.customerStreet) result = result.replace(/\[%KUNDENSTRASSE%\]/g, data.customerStreet);
  if (data.customerCity) result = result.replace(/\[%KUNDENORT%\]/g, data.customerCity);
  if (data.customerPostalCode) result = result.replace(/\[%KUNDENPLZ%\]/g, data.customerPostalCode);
  if (data.customerCountry) result = result.replace(/\[%KUNDENLAND%\]/g, data.customerCountry);
  if (data.customerPhone) result = result.replace(/\[%KUNDENTELEFON%\]/g, data.customerPhone);

  // Dokument-Platzhalter
  if (data.documentNumber || data.invoiceNumber) {
    const number = data.documentNumber || data.invoiceNumber || '';
    result = result.replace(/\[%DOKUMENTNUMMER%\]/g, number);
    result = result.replace(/\[%RECHNUNGSNUMMER%\]/g, number);
  }
  if (data.quoteNumber) result = result.replace(/\[%ANGEBOTSNUMMER%\]/g, data.quoteNumber);
  if (data.documentDate) result = result.replace(/\[%DOKUMENTDATUM%\]/g, data.documentDate);
  if (data.dueDate) result = result.replace(/\[%FAELLIGKEITSDATUM%\]/g, data.dueDate);
  if (data.serviceDate) result = result.replace(/\[%LEISTUNGSDATUM%\]/g, data.serviceDate);
  if (data.servicePeriod) result = result.replace(/\[%LEISTUNGSZEITRAUM%\]/g, data.servicePeriod);

  // Beträge (formatiert)
  if (data.totalAmount !== undefined) {
    result = result.replace(/\[%GESAMTBETRAG%\]/g, formatCurrency(data.totalAmount));
  }
  if (data.subtotalAmount !== undefined) {
    result = result.replace(/\[%ZWISCHENSUMME%\]/g, formatCurrency(data.subtotalAmount));
  }
  if (data.taxAmount !== undefined) {
    result = result.replace(/\[%STEUERBETRAG%\]/g, formatCurrency(data.taxAmount));
  }
  if (data.netAmount !== undefined) {
    result = result.replace(/\[%NETTOBETRAG%\]/g, formatCurrency(data.netAmount));
  }

  // Zahlungskonditionen
  if (data.paymentTerms) result = result.replace(/\[%ZAHLUNGSKONDITIONEN%\]/g, data.paymentTerms);
  if (data.skontoText) result = result.replace(/\[%SKONTO%\]/g, data.skontoText);

  // Projekt
  if (data.projectTitle) result = result.replace(/\[%PROJEKTTITEL%\]/g, data.projectTitle);
  if (data.projectDescription)
    result = result.replace(/\[%PROJEKTBESCHREIBUNG%\]/g, data.projectDescription);

  // Aktuelle Datumswerte
  const now = new Date();
  const currentDate = data.currentDate || now.toLocaleDateString('de-DE');
  const currentYear = data.currentYear || now.getFullYear().toString();
  const currentMonth = data.currentMonth || now.toLocaleDateString('de-DE', { month: 'long' });

  result = result.replace(/\[%AKTUELLESDATUM%\]/g, currentDate);
  result = result.replace(/\[%AKTUELLESJAHR%\]/g, currentYear);
  result = result.replace(/\[%AKTUELLER_MONAT%\]/g, currentMonth);

  return result;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export type { PlaceholderData };
