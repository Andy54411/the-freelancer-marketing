// Angebots-spezifische Platzhalter - Zentrale Implementierung
import { PlaceholderRegistry, PlaceholderContext } from '../types';

export const quotePlaceholders: PlaceholderRegistry = {
  // Basis Angebots-Informationen
  ANGEBOTSNUMMER: (context: PlaceholderContext) =>
    context.quote?.quoteNumber || context.quote?.number || '',

  ANGEBOTSDATUM: (context: PlaceholderContext) => {
    const quote = context.quote;
    if (!quote?.quoteDate) return '';

    const date = quote.quoteDate.toDate ? quote.quoteDate.toDate() : new Date(quote.quoteDate);
    return date.toLocaleDateString('de-DE');
  },

  GUELTIGKEITSDATUM: (context: PlaceholderContext) => {
    const quote = context.quote;
    if (!quote?.validUntil) return '';

    const date = quote.validUntil.toDate ? quote.validUntil.toDate() : new Date(quote.validUntil);
    return date.toLocaleDateString('de-DE');
  },

  GUELTIGKEITSDAUER: (context: PlaceholderContext) => {
    const quote = context.quote;
    return quote?.validityPeriod ? `${quote.validityPeriod} Tage` : '';
  },

  // Angebots-Beträge
  ANGEBOT_NETTOBETRAG: (context: PlaceholderContext) => {
    const quote = context.quote;
    if (!quote?.netAmount && quote?.netAmount !== 0) return '';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: quote.currency || 'EUR',
    }).format(quote.netAmount);
  },

  ANGEBOT_STEUERBETRAG: (context: PlaceholderContext) => {
    const quote = context.quote;
    if (!quote?.taxAmount && quote?.taxAmount !== 0) return '';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: quote.currency || 'EUR',
    }).format(quote.taxAmount);
  },

  ANGEBOT_GESAMTBETRAG: (context: PlaceholderContext) => {
    const quote = context.quote;
    if (!quote?.totalAmount && quote?.totalAmount !== 0) return '';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: quote.currency || 'EUR',
    }).format(quote.totalAmount);
  },

  // Status und Metadaten
  ANGEBOTSSTATUS: (context: PlaceholderContext) => {
    const status = context.quote?.status;
    const statusMap: { [key: string]: string } = {
      draft: 'Entwurf',
      sent: 'Versendet',
      accepted: 'Angenommen',
      rejected: 'Abgelehnt',
      expired: 'Abgelaufen',
    };
    return statusMap[status] || status || '';
  },

  ANGEBOTS_REVISION: (context: PlaceholderContext) =>
    context.quote?.revision ? context.quote.revision.toString() : '1',

  // Projektbezug
  ANGEBOT_PROJEKTNAME: (context: PlaceholderContext) => context.quote?.projectName || '',

  ANGEBOT_PROJEKTBESCHREIBUNG: (context: PlaceholderContext) =>
    context.quote?.projectDescription || '',

  // Zahlungskonditionen
  ANGEBOT_ZAHLUNGSBEDINGUNGEN: (context: PlaceholderContext) => context.quote?.paymentTerms || '',

  ANGEBOT_LIEFERBEDINGUNGEN: (context: PlaceholderContext) => context.quote?.deliveryTerms || '',

  // Gültigkeitsberechnungen
  TAGE_BIS_ABLAUF: (context: PlaceholderContext) => {
    const quote = context.quote;
    if (!quote?.validUntil) return '';

    const validUntil = quote.validUntil.toDate
      ? quote.validUntil.toDate()
      : new Date(quote.validUntil);
    const today = new Date();
    const diffTime = validUntil.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays.toString();
  },

  ANGEBOT_ABLAUF_STATUS: (context: PlaceholderContext) => {
    const quote = context.quote;
    if (!quote?.validUntil) return '';

    const validUntil = quote.validUntil.toDate
      ? quote.validUntil.toDate()
      : new Date(quote.validUntil);
    const today = new Date();

    return validUntil > today ? 'Gültig' : 'Abgelaufen';
  },

  // Bemerkungen
  ANGEBOT_BEMERKUNGEN: (context: PlaceholderContext) =>
    context.quote?.notes || context.quote?.remarks || '',

  ANGEBOT_BEDINGUNGEN: (context: PlaceholderContext) => context.quote?.conditions || '',
};

export default quotePlaceholders;
