/**
 * Formatierungsfunktionen für Rechnungsvorlagen
 */

/**
 * Formatiert ein Datum nach deutschem Standard (DIN 5008)
 */
export const formatDate = (input: string): string => {
  if (!input) return '';
  const d = new Date(input);
  return isNaN(d.getTime()) ? input : d.toLocaleDateString('de-DE');
};

/**
 * Formatiert einen Währungsbetrag nach deutschem Standard
 */
export const formatCurrency = (value: number, currency: string = 'EUR'): string => {
  return new Intl.NumberFormat('de-DE', { 
    style: 'currency', 
    currency
  }).format(value);
};

/**
 * Generiert einen standardisierten Footer-Text mit dynamischen Platzhaltern
 */
export const generateFooterText = (params: {
  total: number;
  currency?: string;
  invoiceNumber: string;
  dueDate?: string;
  date?: string;
  companyName?: string;
}): string => {
  const { total, currency = 'EUR', invoiceNumber, dueDate, date, companyName = '' } = params;
  const amount = formatCurrency(total, currency);
  const formattedDueDate = dueDate ? formatDate(dueDate) : '';
  const formattedDate = date ? formatDate(date) : '';

  return [
    `Wir bitten Sie, den Rechnungsbetrag von ${amount} unter Angabe der Rechnungsnummer ${invoiceNumber} auf das unten angegebene Konto zu überweisen.`,
    formattedDueDate ? ` Zahlungsziel: ${formattedDueDate}.` : '',
    formattedDate ? ` Rechnungsdatum: ${formattedDate}` : '',
    '\n\nVielen Dank für Ihr Vertrauen und die angenehme Zusammenarbeit!',
    'Mit freundlichen Grüßen',
    companyName
  ].join('');
};