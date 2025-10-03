// Rechnungs-spezifische Platzhalter - Zentrale Implementierung
import { PlaceholderRegistry, PlaceholderContext } from '../types';

export const invoicePlaceholders: PlaceholderRegistry = {
  // Basis Rechnungs-Informationen
  RECHNUNGSNUMMER: (context: PlaceholderContext) =>
    context.invoice?.invoiceNumber || context.invoice?.number || '',

  RECHNUNGSDATUM: (context: PlaceholderContext) => {
    const invoice = context.invoice;
    if (!invoice?.invoiceDate) return '';

    const date = invoice.invoiceDate.toDate
      ? invoice.invoiceDate.toDate()
      : new Date(invoice.invoiceDate);
    return date.toLocaleDateString('de-DE');
  },

  FAELLIGKEITSDATUM: (context: PlaceholderContext) => {
    const invoice = context.invoice;
    if (!invoice?.dueDate) return '';

    const date = invoice.dueDate.toDate ? invoice.dueDate.toDate() : new Date(invoice.dueDate);
    return date.toLocaleDateString('de-DE');
  },

  LEISTUNGSDATUM: (context: PlaceholderContext) => {
    const invoice = context.invoice;
    if (!invoice?.serviceDate) return '';

    const date = invoice.serviceDate.toDate
      ? invoice.serviceDate.toDate()
      : new Date(invoice.serviceDate);
    return date.toLocaleDateString('de-DE');
  },

  LEISTUNGSZEITRAUM: (context: PlaceholderContext) => {
    const invoice = context.invoice;
    if (!invoice?.servicePeriodStart || !invoice?.servicePeriodEnd) return '';

    const startDate = invoice.servicePeriodStart.toDate
      ? invoice.servicePeriodStart.toDate()
      : new Date(invoice.servicePeriodStart);
    const endDate = invoice.servicePeriodEnd.toDate
      ? invoice.servicePeriodEnd.toDate()
      : new Date(invoice.servicePeriodEnd);

    return `${startDate.toLocaleDateString('de-DE')} - ${endDate.toLocaleDateString('de-DE')}`;
  },

  // Beträge und Steuer
  NETTOBETRAG: (context: PlaceholderContext) => {
    const invoice = context.invoice;
    if (!invoice?.netAmount && invoice?.netAmount !== 0) return '';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: invoice.currency || 'EUR',
    }).format(invoice.netAmount);
  },

  STEUERBETRAG: (context: PlaceholderContext) => {
    const invoice = context.invoice;
    if (!invoice?.taxAmount && invoice?.taxAmount !== 0) return '';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: invoice.currency || 'EUR',
    }).format(invoice.taxAmount);
  },

  BRUTTOBETRAG: (context: PlaceholderContext) => {
    const invoice = context.invoice;
    if (!invoice?.totalAmount && invoice?.totalAmount !== 0) return '';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: invoice.currency || 'EUR',
    }).format(invoice.totalAmount);
  },

  GESAMTBETRAG: (context: PlaceholderContext) => {
    const invoice = context.invoice;
    if (!invoice?.totalAmount && invoice?.totalAmount !== 0) return '';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: invoice.currency || 'EUR',
    }).format(invoice.totalAmount);
  },

  STEUERSATZ: (context: PlaceholderContext) => {
    const invoice = context.invoice;
    if (!invoice?.taxRate && invoice?.taxRate !== 0) return '';
    return `${invoice.taxRate}%`;
  },

  WAEHRUNG: (context: PlaceholderContext) => context.invoice?.currency || 'EUR',

  // Zahlungsinformationen
  ZAHLUNGSZIEL: (context: PlaceholderContext) => {
    const invoice = context.invoice;
    return invoice?.paymentTerms ? `${invoice.paymentTerms} Tage` : '';
  },

  ZAHLUNGSART: (context: PlaceholderContext) => context.invoice?.paymentMethod || '',

  VERWENDUNGSZWECK: (context: PlaceholderContext) =>
    context.invoice?.reference || context.invoice?.invoiceNumber || '',

  // Status und Metadaten
  RECHNUNGSSTATUS: (context: PlaceholderContext) => {
    const status = context.invoice?.status;
    const statusMap: { [key: string]: string } = {
      draft: 'Entwurf',
      sent: 'Versendet',
      paid: 'Bezahlt',
      overdue: 'Überfällig',
      cancelled: 'Storniert',
    };
    return statusMap[status] || status || '';
  },

  RECHNUNGSART: (context: PlaceholderContext) => {
    const type = context.invoice?.type;
    const typeMap: { [key: string]: string } = {
      invoice: 'Rechnung',
      credit: 'Gutschrift',
      storno: 'Storno',
      reminder: 'Mahnung',
    };
    return typeMap[type] || type || 'Rechnung';
  },

  // Bestellbezug
  BESTELLNUMMER: (context: PlaceholderContext) =>
    context.invoice?.orderNumber || context.invoice?.purchaseOrderNumber || '',

  BESTELLDATUM: (context: PlaceholderContext) => {
    const invoice = context.invoice;
    if (!invoice?.orderDate) return '';

    const date = invoice.orderDate.toDate
      ? invoice.orderDate.toDate()
      : new Date(invoice.orderDate);
    return date.toLocaleDateString('de-DE');
  },

  PROJEKTNUMMER: (context: PlaceholderContext) => context.invoice?.projectNumber || '',

  PROJEKTNAME: (context: PlaceholderContext) => context.invoice?.projectName || '',

  // Rabatte und Zuschläge
  RABATTBETRAG: (context: PlaceholderContext) => {
    const invoice = context.invoice;
    if (!invoice?.discountAmount && invoice?.discountAmount !== 0) return '';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: invoice.currency || 'EUR',
    }).format(invoice.discountAmount);
  },

  RABATTSATZ: (context: PlaceholderContext) => {
    const invoice = context.invoice;
    if (!invoice?.discountRate && invoice?.discountRate !== 0) return '';
    return `${invoice.discountRate}%`;
  },

  // Versand und Lieferung
  VERSANDKOSTEN: (context: PlaceholderContext) => {
    const invoice = context.invoice;
    if (!invoice?.shippingCost && invoice?.shippingCost !== 0) return '';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: invoice.currency || 'EUR',
    }).format(invoice.shippingCost);
  },

  LIEFERADRESSE: (context: PlaceholderContext) => context.invoice?.deliveryAddress || '',

  LIEFERDATUM: (context: PlaceholderContext) => {
    const invoice = context.invoice;
    if (!invoice?.deliveryDate) return '';

    const date = invoice.deliveryDate.toDate
      ? invoice.deliveryDate.toDate()
      : new Date(invoice.deliveryDate);
    return date.toLocaleDateString('de-DE');
  },

  // Bemerkungen und Notizen
  BEMERKUNGEN: (context: PlaceholderContext) =>
    context.invoice?.notes || context.invoice?.remarks || '',

  INTERNE_NOTIZEN: (context: PlaceholderContext) => context.invoice?.internalNotes || '',

  ZAHLUNGSHINWEIS: (context: PlaceholderContext) => context.invoice?.paymentNote || '',

  // Storno-spezifische Platzhalter
  STORNO_GRUND: (context: PlaceholderContext) => context.invoice?.cancelReason || '',

  STORNO_DATUM: (context: PlaceholderContext) => {
    const invoice = context.invoice;
    if (!invoice?.cancelDate) return '';

    const date = invoice.cancelDate.toDate
      ? invoice.cancelDate.toDate()
      : new Date(invoice.cancelDate);
    return date.toLocaleDateString('de-DE');
  },

  ORIGINAL_RECHNUNGSNUMMER: (context: PlaceholderContext) =>
    context.invoice?.originalInvoiceNumber || '',

  // Berechnete Felder
  TAGE_BIS_FAELLIGKEIT: (context: PlaceholderContext) => {
    const invoice = context.invoice;
    if (!invoice?.dueDate) return '';

    const dueDate = invoice.dueDate.toDate ? invoice.dueDate.toDate() : new Date(invoice.dueDate);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays.toString();
  },

  POSITION_ANZAHL: (context: PlaceholderContext) => {
    const invoice = context.invoice;
    return invoice?.items?.length ? invoice.items.length.toString() : '0';
  },
};

export default invoicePlaceholders;
