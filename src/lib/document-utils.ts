/**
 * Document Type Utilities
 * Funktionen zur Bestimmung und Verwaltung von Dokumenttypen
 */

export type DocumentType = 'invoice' | 'quote' | 'reminder' | 'credit-note' | 'cancellation';

export interface DocumentTypeConfig {
  title: string;
  numberLabel: string;
  dateLabel: string;
  dueDateLabel: string;
  recipientLabel: string;
  color: string;
  showPaymentTerms: boolean;
  showDueDate: boolean;
}

export const DOCUMENT_TYPE_CONFIGS: Record<DocumentType, Omit<DocumentTypeConfig, 'color'>> = {
  invoice: {
    title: 'Rechnung',
    numberLabel: 'Rechnungsnummer',
    dateLabel: 'Rechnungsdatum',
    dueDateLabel: 'Fälligkeitsdatum',
    recipientLabel: 'Rechnungsempfänger',
    showPaymentTerms: true,
    showDueDate: true,
  },
  quote: {
    title: 'Angebot',
    numberLabel: 'Angebotsnummer',
    dateLabel: 'Angebotsdatum', 
    dueDateLabel: 'Gültig bis',
    recipientLabel: 'Angebotsempfänger',
    showPaymentTerms: false,
    showDueDate: true,
  },
  reminder: {
    title: 'Mahnung',
    numberLabel: 'Mahnungsnummer',
    dateLabel: 'Mahnungsdatum',
    dueDateLabel: 'Zahlungsfrist',
    recipientLabel: 'Schuldner',
    showPaymentTerms: true,
    showDueDate: true,
  },
  'credit-note': {
    title: 'Gutschrift',
    numberLabel: 'Gutschriftnummer',
    dateLabel: 'Gutschriftdatum',
    dueDateLabel: 'Auszahlungsdatum',
    recipientLabel: 'Empfänger',
    showPaymentTerms: false,
    showDueDate: false,
  },
  cancellation: {
    title: 'Storno Rechnung',
    numberLabel: 'Storno-Nr.',
    dateLabel: 'Storno-Datum',
    dueDateLabel: 'Ursprünglich fällig',
    recipientLabel: 'Rechnungsempfänger',
    showPaymentTerms: false,
    showDueDate: true,
  }
};

export const DOCUMENT_TYPE_COLORS: Record<DocumentType, string> = {
  invoice: '#3b82f6',    // Blue
  quote: '#8b5cf6',      // Purple
  reminder: '#ef4444',   // Red
  'credit-note': '#22c55e', // Green
  cancellation: '#f59e0b'   // Orange
};

/**
 * Bestimmt den Dokumenttyp basierend auf verschiedenen Kriterien
 */
export function detectDocumentType(data: any): DocumentType {
  // Prüfe explizite documentType Felder
  if (data.documentType && Object.keys(DOCUMENT_TYPE_CONFIGS).includes(data.documentType)) {
    return data.documentType as DocumentType;
  }

  // Prüfe documentLabel für Schlüsselwörter
  const label = (data.documentLabel || '').toLowerCase();
  
  if (label.includes('angebot') || label.includes('quote')) {
    return 'quote';
  }
  
  if (label.includes('mahnung') || label.includes('reminder')) {
    return 'reminder';
  }
  
  if (label.includes('gutschrift') || label.includes('credit')) {
    return 'credit-note';
  }
  
  if (label.includes('storno') || label.includes('cancellation')) {
    return 'cancellation';
  }

  // Prüfe Nummern-Präfixe
  const invoiceNumber = (data.invoiceNumber || '').toLowerCase();
  
  if (invoiceNumber.startsWith('ang') || invoiceNumber.startsWith('quo')) {
    return 'quote';
  }
  
  if (invoiceNumber.startsWith('mah') || invoiceNumber.startsWith('rem')) {
    return 'reminder';
  }
  
  if (invoiceNumber.startsWith('gut') || invoiceNumber.startsWith('cre')) {
    return 'credit-note';
  }
  
  if (invoiceNumber.startsWith('sto') || invoiceNumber.startsWith('can')) {
    return 'cancellation';
  }

  // Standard: Rechnung
  return 'invoice';
}

/**
 * Erstellt die komplette Dokumenttyp-Konfiguration mit Farbe
 */
export function getDocumentTypeConfig(documentType: DocumentType, customColor?: string): DocumentTypeConfig {
  const baseConfig = DOCUMENT_TYPE_CONFIGS[documentType];
  const color = customColor || DOCUMENT_TYPE_COLORS[documentType];
  
  return {
    ...baseConfig,
    color
  };
}