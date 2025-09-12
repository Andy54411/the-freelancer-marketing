'use client';

/**
 * Deutsche Rechnungstypen für GoBD-konforme Buchführung
 * Implementiert fortlaufende Rechnungsnummerierung und Storno-Funktionalität
 * nach deutschem Steuerrecht
 */

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number; // Rabatt in Prozent (0-100), optional für Rückwärtskompatibilität
  total: number;
  taxRate?: number;
}

export interface InvoiceData {
  // Basis-Identifikation
  id: string;
  number: string;
  invoiceNumber: string;
  sequentialNumber: number; // Fortlaufende Nummer (GoBD-konform)

  // Datum-Informationen
  date: string;
  issueDate: string;
  dueDate: string;

  // Kundendaten
  customerName: string;
  customerEmail: string;
  customerAddress: string;

  // Rechnungsbeschreibung
  description: string;

  // Unternehmensdaten
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  companyWebsite: string;
  companyLogo: string;
  profilePictureURL?: string;
  logo?: string;
  companyVatId: string;
  companyTaxNumber: string;
  companyRegister?: string;
  districtCourt?: string;
  legalForm?: string;
  companyTax?: string;

  // Steuereinstellungen
  isSmallBusiness: boolean; // Kleinunternehmerregelung
  vatRate: number;
  priceInput: 'netto' | 'brutto';

  // Finanzielle Daten
  items: InvoiceItem[];
  amount: number; // Nettobetrag
  tax: number; // Steuerbetrag
  total: number; // Gesamtbetrag

  // Status und Metadaten
  status: 'draft' | 'finalized' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'storno';
  createdAt: Date;
  year: number;
  companyId: string;

  // Storno-spezifische Felder
  isStorno: boolean;
  originalInvoiceId?: string; // Referenz zur ursprünglichen Rechnung
  stornoReason?: string; // Grund für die Stornierung
  stornoDate?: Date; // Datum der Stornierung
  stornoBy?: string; // Wer die Stornierung durchgeführt hat

  // Optionale Zusatzfelder
  notes?: string;
  taxNote?: 'kleinunternehmer' | 'reverse-charge' | 'none'; // Steuerhinweise (Kleinunternehmer, Reverse-Charge, etc.)
  paymentTerms?: string;

  // Skonto-Einstellungen
  skontoEnabled?: boolean;
  skontoDays?: number;
  skontoPercentage?: number;
  skontoText?: string;

  bankDetails?: {
    iban: string;
    bic?: string;
    accountHolder: string;
    bankName?: string;
  };
}

/**
 * Rechnungsnummerierung für GoBD-konforme fortlaufende Nummern
 */
export interface InvoiceNumbering {
  companyId: string;
  year: number;
  lastNumber: number;
  nextNumber: number;
  updatedAt: Date;
}

/**
 * Storno-Rechnung Interface
 */
export interface StornoInvoiceData extends Omit<InvoiceData, 'items' | 'amount' | 'tax' | 'total'> {
  // Storno-Rechnungen haben negative Beträge
  items: InvoiceItem[];
  amount: number; // Negativer Nettobetrag
  tax: number; // Negativer Steuerbetrag
  total: number; // Negativer Gesamtbetrag

  // Pflichtfelder für Storno
  isStorno: true;
  originalInvoiceId: string;
  stornoReason: string;
  stornoDate: Date;
  stornoBy: string;
}

/**
 * Service-Klasse für deutsche Rechnungsbehandlung
 */
export class GermanInvoiceService {
  /**
   * Erstellt eine Storno-Rechnung aus einer ursprünglichen Rechnung
   */
  static createStornoInvoice(
    originalInvoice: InvoiceData,
    stornoReason: string,
    stornoBy: string,
    newSequentialNumber: number
  ): StornoInvoiceData {
    const stornoDate = new Date();
    const currentYear = stornoDate.getFullYear();

    return {
      ...originalInvoice,
      id: `storno_${Date.now()}`,
      number: `${currentYear}-${String(newSequentialNumber).padStart(3, '0')}`,
      invoiceNumber: `${currentYear}-${String(newSequentialNumber).padStart(3, '0')}`,
      sequentialNumber: newSequentialNumber,
      date: stornoDate.toISOString().split('T')[0],
      issueDate: stornoDate.toISOString().split('T')[0],
      dueDate: stornoDate.toISOString().split('T')[0], // Storno-Rechnungen sind sofort fällig

      // Negative Beträge für Storno
      items: originalInvoice.items.map(item => ({
        ...item,
        quantity: -item.quantity,
        total: -item.total,
      })),
      amount: -originalInvoice.amount,
      tax: -originalInvoice.tax,
      total: -originalInvoice.total,

      // Storno-spezifische Daten
      status: 'storno',
      isStorno: true,
      originalInvoiceId: originalInvoice.id,
      stornoReason,
      stornoDate,
      stornoBy,

      // Neue Metadaten
      createdAt: stornoDate,
      year: currentYear,
    };
  }

  /**
   * Validiert eine Rechnung nach deutschen Standards
   */
  static validateInvoice(invoice: InvoiceData): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Pflichtfelder prüfen
    if (!invoice.sequentialNumber || invoice.sequentialNumber <= 0) {
      errors.push('Fortlaufende Rechnungsnummer ist erforderlich');
    }

    if (!invoice.companyName) {
      errors.push('Firmenname ist erforderlich');
    }

    if (!invoice.companyAddress) {
      errors.push('Firmenadresse ist erforderlich');
    }

    if (!invoice.customerName) {
      errors.push('Kundenname ist erforderlich');
    }

    if (!invoice.customerAddress) {
      errors.push('Kundenadresse ist erforderlich');
    }

    if (!invoice.issueDate) {
      errors.push('Rechnungsdatum ist erforderlich');
    }

    if (!invoice.dueDate) {
      errors.push('Fälligkeitsdatum ist erforderlich');
    }

    // Steuernummer oder USt-IdNr. prüfen
    if (!invoice.companyTaxNumber && !invoice.companyVatId) {
      errors.push('Steuernummer oder USt-IdNr. ist erforderlich');
    }

    // Kleinunternehmerregelung prüfen
    if (invoice.isSmallBusiness && invoice.tax > 0) {
      errors.push('Bei Kleinunternehmerregelung darf keine MwSt. ausgewiesen werden');
    }

    // Positionen prüfen
    if (!invoice.items || invoice.items.length === 0) {
      errors.push('Mindestens eine Rechnungsposition ist erforderlich');
    }

    invoice.items?.forEach((item, index) => {
      if (!item.description) {
        errors.push(`Position ${index + 1}: Beschreibung ist erforderlich`);
      }
      if (item.quantity <= 0) {
        errors.push(`Position ${index + 1}: Menge muss größer als 0 sein`);
      }
      if (item.unitPrice <= 0) {
        errors.push(`Position ${index + 1}: Einzelpreis muss größer als 0 sein`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Formatiert eine Rechnungsnummer nach deutschem Standard
   */
  static formatInvoiceNumber(sequentialNumber: number, year?: number): string {
    const currentYear = year || new Date().getFullYear();
    return `R-${currentYear}-${String(sequentialNumber).padStart(3, '0')}`;
  }

  /**
   * Berechnet MwSt. basierend auf Netto-/Brutto-Eingabe
   */
  static calculateTax(
    amount: number,
    taxRate: number,
    isGross: boolean
  ): {
    net: number;
    tax: number;
    gross: number;
  } {
    if (isGross) {
      // Brutto-Eingabe: MwSt. herausrechnen
      const gross = amount;
      const net = gross / (1 + taxRate / 100);
      const tax = gross - net;

      return {
        net: Math.round(net * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        gross: Math.round(gross * 100) / 100,
      };
    } else {
      // Netto-Eingabe: MwSt. hinzurechnen
      const net = amount;
      const tax = net * (taxRate / 100);
      const gross = net + tax;

      return {
        net: Math.round(net * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        gross: Math.round(gross * 100) / 100,
      };
    }
  }
}

/**
 * Status-Helper für deutsche Rechnungen
 */
export const InvoiceStatusHelper = {
  getStatusLabel: (status: InvoiceData['status']): string => {
    const labels = {
      draft: 'Entwurf',
      sent: 'Gesendet',
      paid: 'Bezahlt',
      overdue: 'Überfällig',
      cancelled: 'Abgebrochen',
      storno: 'Storniert',
    };
    return labels[status] || status;
  },

  getStatusColor: (status: InvoiceData['status']): string => {
    const colors = {
      draft: 'gray',
      sent: 'blue',
      paid: 'green',
      overdue: 'red',
      cancelled: 'gray',
      storno: 'red',
    };
    return colors[status] || 'gray';
  },

  canBeStorniert: (invoice: InvoiceData): boolean => {
    return (invoice.status === 'sent' || invoice.status === 'paid') && !invoice.isStorno;
  },

  canBeEdited: (invoice: InvoiceData): boolean => {
    return invoice.status === 'draft' && !invoice.isStorno;
  },

  canBeDeleted: (invoice: InvoiceData): boolean => {
    return invoice.status === 'draft' && !invoice.isStorno;
  },
};
