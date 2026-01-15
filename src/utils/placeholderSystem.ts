// Platzhalter-System für Textvorlagen
import { formatCurrency } from '@/lib/utils';

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

  // Kontaktperson
  internalContactPerson?: string;
  contactPersonName?: string;

  // User-spezifische Daten (aus Users Collection)
  firstName?: string;
  lastName?: string;
  userEmail?: string;
  userPhone?: string;

  // Erweiterte Firmen-Daten
  companyFax?: string;
  companyRegister?: string;

  // Erweiterte Kunden-Daten
  customerCompany?: string;

  // Erweiterte Beträge und Finanzen
  discountAmount?: number;
  discountPercentage?: number;
  orderNumber?: string;
  currency?: string;

  // Weitere Daten
  [key: string]: any;

  // Projektinformationen
  projectTitle?: string;
  projectDescription?: string;

  // Zeitraum
  currentDate?: string;
  currentYear?: string;
  currentMonth?: string;
}

export function replacePlaceholders(
  text: string,
  data: PlaceholderData,
  language: string = 'de'
): string {
  if (!text) return '';

  let result = text;

  // � DEBUG: Kritische Eingabe-Daten loggen

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

  // Kunden-Platzhalter
  if (data.customerName) {
    result = result.replace(/\[%KUNDENNAME%\]/g, data.customerName);
    result = result.replace(/\[%KUNDENFIRMA%\]/g, data.customerName); // 🆕 KUNDENFIRMA Platzhalter hinzugefügt

    // Mehrsprachige Anrede generieren
    const salutations = {
      de: {
        formal: 'Sehr geehrte Damen und Herren',
        female: 'Sehr geehrte Frau',
        male: 'Sehr geehrter Herr',
        general: 'Sehr geehrte Damen und Herren',
      },
      en: {
        formal: 'Dear Sir or Madam',
        female: 'Dear Ms.',
        male: 'Dear Mr.',
        general: 'Dear Sir or Madam',
      },
      fr: {
        formal: 'Mesdames et Messieurs',
        female: 'Chère Madame',
        male: 'Cher Monsieur',
        general: 'Mesdames et Messieurs',
      },
    };

    const langSalutations = salutations[language as keyof typeof salutations] || salutations['de'];

    let anrede;
    if (
      data.customerName.includes('GmbH') ||
      data.customerName.includes('AG') ||
      data.customerName.includes('UG') ||
      data.customerName.includes('Ltd') ||
      data.customerName.includes('Inc')
    ) {
      anrede = langSalutations.formal;
    } else if (
      data.customerName.toLowerCase().includes('frau') ||
      data.customerName.toLowerCase().includes('ms.')
    ) {
      anrede = `${langSalutations.female} ${data.customerName}`;
    } else if (
      data.customerName.toLowerCase().includes('herr') ||
      data.customerName.toLowerCase().includes('mr.')
    ) {
      anrede = `${langSalutations.male} ${data.customerName}`;
    } else {
      anrede = langSalutations.general;
    }

    result = result.replace(/\[%ANREDE%\]/g, anrede);
    result = result.replace(/\[%VOLLEANREDE%\]/g, `${anrede},`);
  }
  // Kunden-Informationen (erweitert) - IMMER ersetzen, auch mit leerem String
  const customerName = data.customerName || '';
  result = result.replace(/\[%KUNDE%\]/g, customerName);
  result = result.replace(/\[%KUNDENEMAIL%\]/g, data.customerEmail || '');
  result = result.replace(/\[%KUNDENADRESSE%\]/g, data.customerAddress || '');
  result = result.replace(/\[%KUNDENSTRASSE%\]/g, data.customerStreet || '');
  result = result.replace(/\[%KUNDENORT%\]/g, data.customerCity || '');
  result = result.replace(/\[%KUNDENPLZ%\]/g, data.customerPostalCode || '');
  result = result.replace(/\[%KUNDENLAND%\]/g, data.customerCountry || '');
  result = result.replace(/\[%KUNDENTELEFON%\]/g, data.customerPhone || '');

  // Firmen-Informationen
  const companyName = data.companyName || '';
  result = result.replace(/\[%FIRMENNAME%\]/g, companyName);
  result = result.replace(/\[%FIRMA%\]/g, companyName);
  result = result.replace(/\[%FIRMENEMAIL%\]/g, data.companyEmail || '');
  result = result.replace(/\[%FIRMENTELEFON%\]/g, data.companyPhone || '');
  result = result.replace(/\[%FIRMENWEBSITE%\]/g, data.companyWebsite || '');
  result = result.replace(/\[%FIRMENADRESSE%\]/g, (data as any).companyAddress || '');
  result = result.replace(/\[%FIRMENFAX%\]/g, ''); // Placeholder für Fax
  result = result.replace(/\[%USTID%\]/g, data.companyVatId || '');
  result = result.replace(/\[%HANDELSREGISTER%\]/g, (data as any).companyRegister || '');

  // Bankdaten - ALLE möglichen Quellen durchsuchen
  // Bank-Daten aus den verfügbaren Quellen extrahieren

  const bankDetails = (data as any).bankDetails || {};
  const step4 = (data as any).step4 || {};
  const step3 = (data as any).step3 || {};
  const step3BankDetails = step3.bankDetails || {};

  // Alle möglichen IBAN Quellen
  const iban =
    bankDetails.iban ||
    step4.iban ||
    step3BankDetails.iban ||
    data.companyIban ||
    (data as any).iban ||
    '';

  // Alle möglichen BIC Quellen
  const bic =
    bankDetails.bic ||
    step4.bic ||
    step3BankDetails.bic ||
    data.companyBic ||
    (data as any).bic ||
    '';

  // Alle möglichen Bankname Quellen
  const bankName =
    bankDetails.bankName ||
    step4.bankName ||
    step3BankDetails.bankName ||
    (data as any).bankName ||
    '';

  // Alle möglichen Kontoinhaber Quellen
  const accountHolder =
    bankDetails.accountHolder ||
    step4.accountHolder ||
    step3BankDetails.accountHolder ||
    (data as any).accountHolder ||
    companyName;

  result = result.replace(/\[%IBAN%\]/g, iban);
  result = result.replace(/\[%BIC%\]/g, bic);
  result = result.replace(/\[%BANKNAME%\]/g, bankName);
  result = result.replace(/\[%KONTOINHABER%\]/g, accountHolder);

  // Dokument-Platzhalter - IMMER ersetzen
  const docNumber = data.documentNumber || data.invoiceNumber || '';
  result = result.replace(/\[%DOKUMENTNUMMER%\]/g, docNumber);
  result = result.replace(/\[%RECHNUNGSNUMMER%\]/g, docNumber);
  result = result.replace(/\[%ANGEBOTSNUMMER%\]/g, docNumber);

  // Gültigkeitsdatum wird weiter unten verarbeitet

  // Datumsfelder - IMMER ersetzen und Datumsvalidierung
  let documentDateFormatted = '';

  if (data.documentDate) {
    try {
      let date: Date;

      // Erkenne deutsches Datumsformat DD.MM.YYYY oder DD/MM/YYYY
      if (
        typeof data.documentDate === 'string' &&
        data.documentDate.match(/^\d{2}[.\/]\d{2}[.\/]\d{4}$/)
      ) {
        const parts = data.documentDate.split(/[.\/]/);
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Monate sind 0-basiert in JS
        const year = parseInt(parts[2], 10);
        date = new Date(year, month, day);
      } else {
        // Fallback für andere Formate
        date = new Date(data.documentDate);
      }

      if (!isNaN(date.getTime())) {
        documentDateFormatted = date.toLocaleDateString('de-DE');
      } else {
        // Falls alles fehlschlägt, verwende den ursprünglichen String
        documentDateFormatted = String(data.documentDate);
      }
    } catch {
      documentDateFormatted = String(data.documentDate); // Fallback: ursprünglichen String verwenden
    }
  }

  result = result.replace(/\[%DOKUMENTDATUM%\]/g, documentDateFormatted);
  result = result.replace(/\[%DATUM%\]/g, documentDateFormatted);
  result = result.replace(/\[%RECHNUNGSDATUM%\]/g, documentDateFormatted);
  result = result.replace(/\[%ANGEBOTSDATUM%\]/g, documentDateFormatted);

  // Dokumentnummern für Lieferscheine und Auftragsbestätigungen
  const deliveryNoteNumber = (data as any).deliveryNoteNumber || docNumber;
  const orderConfirmationNumber = (data as any).orderConfirmationNumber || docNumber;
  result = result.replace(/\[%LIEFERSCHEINNUMMER%\]/g, deliveryNoteNumber);
  result = result.replace(/\[%AB_NUMMER%\]/g, orderConfirmationNumber);
  result = result.replace(/\[%AUFTRAGSBESTAETIGUNGSNUMMER%\]/g, orderConfirmationNumber);

  // Leistungsdatum
  if (data.serviceDate) {
    result = result.replace(/\[%LEISTUNGSDATUM%\]/g, data.serviceDate);
    result = result.replace(/\[%LIEFERDATUM%\]/g, data.serviceDate);
  }
  // Gültigkeitsdatum - mehrere Quellen prüfen - IMMER ersetzen
  const gueltigBis = data.dueDate || data.validUntil || data.expiryDate;
  let formattedDueDate = '';

  if (gueltigBis) {
    try {
      // Erkenne deutsches Datumsformat DD.MM.YYYY oder DD/MM/YYYY für Fälligkeitsdatum
      let dueDate: Date;
      if (typeof gueltigBis === 'string' && gueltigBis.match(/^\d{2}[.\/]\d{2}[.\/]\d{4}$/)) {
        const parts = gueltigBis.split(/[.\/]/);
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Monate sind 0-basiert in JS
        const year = parseInt(parts[2], 10);
        dueDate = new Date(year, month, day);
      } else {
        dueDate = new Date(gueltigBis);
      }

      if (!isNaN(dueDate.getTime())) {
        formattedDueDate = dueDate.toLocaleDateString('de-DE');
      } else {
        formattedDueDate = String(gueltigBis);
      }
    } catch {
      formattedDueDate = String(gueltigBis);
    }
  }

  // IMMER ersetzen - auch mit leerem String wenn kein Datum verfügbar
  result = result.replace(/\[%FAELLIGKEITSDATUM%\]/g, formattedDueDate);
  result = result.replace(/\[%GUELTIG_BIS%\]/g, formattedDueDate); // Für Angebote
  result = result.replace(/\[%GULTIG_BIS%\]/g, formattedDueDate); // Alternative Schreibweise
  // Leistungsdatum - mehrere Quellen prüfen - IMMER ersetzen
  const leistungsDatum = data.serviceDate || data.documentDate;
  let formattedServiceDate = '';

  if (leistungsDatum) {
    try {
      const serviceDate = new Date(leistungsDatum);
      if (!isNaN(serviceDate.getTime())) {
        formattedServiceDate = serviceDate.toLocaleDateString('de-DE');
      } else {
        formattedServiceDate = leistungsDatum; // Falls es schon ein String ist
      }
    } catch {
      formattedServiceDate = leistungsDatum; // Fallback: ursprünglichen String verwenden
    }
  }

  result = result.replace(/\[%LEISTUNGSDATUM%\]/g, formattedServiceDate);
  result = result.replace(/\[%LIEFERDATUM%\]/g, formattedServiceDate);
  result = result.replace(/\[%LEISTUNGSZEITRAUM%\]/g, data.servicePeriod || '');

  // Betrag-Platzhalter mit Formatierung - IMMER ersetzen
  const totalAmount = data.totalAmount || 0;
  result = result.replace(/\[%GESAMTSUMME%\]/g, formatCurrency(totalAmount));
  result = result.replace(/\[%ENDSUMME%\]/g, formatCurrency(totalAmount));
  result = result.replace(/\[%GESAMTBETRAG%\]/g, formatCurrency(totalAmount));
  result = result.replace(/\[%TOTAL_AMOUNT%\]/g, formatCurrency(totalAmount));

  // Alle Betragsplatzhalter - IMMER ersetzen
  const netAmount = data.subtotalAmount || data.netAmount || 0;
  result = result.replace(/\[%NETTOBETRAG%\]/g, formatCurrency(netAmount));
  result = result.replace(/\[%NETTOSUMME%\]/g, formatCurrency(netAmount));
  result = result.replace(/\[%NET_AMOUNT%\]/g, formatCurrency(netAmount));

  const subtotalAmount = data.subtotalAmount || 0;
  result = result.replace(/\[%ZWISCHENSUMME%\]/g, formatCurrency(subtotalAmount));

  const taxAmount = data.taxAmount || 0;
  result = result.replace(/\[%STEUERBETRAG%\]/g, formatCurrency(taxAmount));
  result = result.replace(/\[%MEHRWERTSTEUERBETRAG%\]/g, formatCurrency(taxAmount));
  result = result.replace(/\[%UMSATZSTEUERBETRAG%\]/g, formatCurrency(taxAmount));

  // Steuersatz und Währung
  const taxRate = (data as any).vatRate || (data as any).taxRate || 19;
  result = result.replace(/\[%MEHRWERTSTEUERSATZ%\]/g, `${taxRate}%`);
  result = result.replace(/\[%STEUERSATZ%\]/g, `${taxRate}%`);

  const currency = (data as any).currency || 'EUR';
  result = result.replace(/\[%WAEHRUNG%\]/g, currency);

  // Rabatt und Skonto
  result = result.replace(/\[%RABATT%\]/g, '0,00 €'); // Placeholder für Rabatt
  result = result.replace(/\[%SKONTO%\]/g, data.skontoText || '');

  // Bestellnummer
  const orderNumber = (data as any).customerOrderNumber || (data as any).orderNumber || '';
  result = result.replace(/\[%BESTELLNUMMER%\]/g, orderNumber);

  // Zahlungskonditionen
  if (data.paymentTerms) {
    result = result.replace(/\[%ZAHLUNGSKONDITIONEN%\]/g, data.paymentTerms);
    result = result.replace(
      /\[%ZAHLUNGSBEDINGUNGEN%\]/g,
      `Zahlbar innerhalb ${data.paymentTerms} Tagen`
    );
  }

  // Zahlungsziel berechnen (paymentTerms Tage ab Rechnungsdatum oder heute)
  // ODER wenn dueDate/validUntil bereits vorhanden ist, dieses verwenden
  const calculatePaymentDue = () => {
    // Wenn bereits ein formatiertes Fälligkeitsdatum vorhanden ist, verwende dieses
    if (formattedDueDate) {
      return formattedDueDate;
    }
    
    const baseDate = data.documentDate ? new Date(data.documentDate) : new Date();
    
    // Extrahiere die Anzahl der Tage aus dem paymentTerms-Text
    // z.B. "Zahlbar binnen 14 Tagen ohne Abzug" → 14
    let days = 14; // Default
    if (data.paymentTerms) {
      const paymentTermsStr = String(data.paymentTerms);
      // Versuche eine Zahl zu extrahieren
      const match = paymentTermsStr.match(/(\d+)\s*Tage/i);
      if (match) {
        days = parseInt(match[1], 10);
      } else {
        // Fallback: versuche direkt als Zahl zu parsen
        const parsed = parseInt(paymentTermsStr, 10);
        if (!isNaN(parsed)) {
          days = parsed;
        }
      }
    }
    
    if (isNaN(days) || days <= 0) {
      days = 14; // Fallback auf 14 Tage
    }

    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + days);
    return dueDate.toLocaleDateString('de-DE');
  };

  result = result.replace(/\[%ZAHLUNGSZIEL%\]/g, calculatePaymentDue());
  if (data.skontoText) result = result.replace(/\[%SKONTO%\]/g, data.skontoText);

  // Kontaktperson und Ansprechpartner
  const kontaktperson =
    (data as any).internalContactPerson ||
    (data as any).contactPersonName ||
    (data as any).companyName ||
    '';
  result = result.replace(/\[%KONTAKTPERSON%\]/g, kontaktperson);
  result = result.replace(/\[%ANSPRECHPARTNER%\]/g, kontaktperson);
  result = result.replace(/\[%BEARBEITER%\]/g, kontaktperson);
  result = result.replace(/\[%SACHBEARBEITER%\]/g, kontaktperson);
  result = result.replace(/\[%VERTRETER%\]/g, kontaktperson);

  // User-spezifische Platzhalter (aus Users Collection)
  if (data.firstName) result = result.replace(/\[%VORNAME%\]/g, data.firstName);
  if (data.lastName) result = result.replace(/\[%NACHNAME%\]/g, data.lastName);
  if (data.userEmail) result = result.replace(/\[%USER_EMAIL%\]/g, data.userEmail);
  if (data.userPhone) result = result.replace(/\[%USER_TELEFON%\]/g, data.userPhone);

  // Kombinierte User-Platzhalter
  const fullName =
    data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : kontaktperson;
  result = result.replace(/\[%VOLLERNAME%\]/g, fullName);
  result = result.replace(/\[%NAME%\]/g, fullName);

  // === ALLE FEHLENDEN PLATZHALTER ===

  // Erweiterte Firmen-Platzhalter
  if (data.companyFax) result = result.replace(/\[%FIRMENFAX%\]/g, data.companyFax);

  // Erweiterte Kunden-Platzhalter
  if (data.customerCompany) result = result.replace(/\[%KUNDENFIRMA%\]/g, data.customerCompany);

  // Beträge und Finanzen
  if (data.discountAmount !== undefined)
    result = result.replace(/\[%RABATT%\]/g, formatCurrency(data.discountAmount));
  if (data.orderNumber) result = result.replace(/\[%BESTELLNUMMER%\]/g, data.orderNumber);
  if (data.currency) result = result.replace(/\[%WAEHRUNG%\]/g, data.currency);

  // Steuersatz formatierung
  if (data.taxAmount !== undefined) {
    const vatRate = data.vatRate || 19;
    result = result.replace(/\[%MEHRWERTSTEUERSATZ%\]/g, `${vatRate}%`);
  }

  // Projekt
  if (data.projectTitle) result = result.replace(/\[%PROJEKTTITEL%\]/g, data.projectTitle);
  if (data.projectDescription)
    result = result.replace(/\[%PROJEKTBESCHREIBUNG%\]/g, data.projectDescription);

  // Erweiterte Datums-Platzhalter
  const now = new Date();
  const currentDate = now.toLocaleDateString('de-DE');
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  const currentQuarter = Math.ceil(currentMonth / 3);

  // Basis-Datums-Platzhalter
  result = result.replace(/\[%DATUM%\]/g, currentDate);
  result = result.replace(/\[%HEUTE%\]/g, currentDate);
  result = result.replace(/\[%AKTUELLESDATUM%\]/g, currentDate);

  // Jahr-Platzhalter
  result = result.replace(/\[%JAHR%\]/g, currentYear.toString());
  result = result.replace(/\[%AKTUELLESJAHR%\]/g, currentYear.toString());
  result = result.replace(/\[%JAHR\.KURZ%\]/g, currentYear.toString().slice(-2));
  result = result.replace(/\[%VORJAHR%\]/g, (currentYear - 1).toString());
  result = result.replace(/\[%VORJAHR\.KURZ%\]/g, (currentYear - 1).toString().slice(-2));
  result = result.replace(/\[%FOLGEJAHR%\]/g, (currentYear + 1).toString());
  result = result.replace(/\[%FOLGEJAHR\.KURZ%\]/g, (currentYear + 1).toString().slice(-2));

  // Monat-Platzhalter
  const monthNames = [
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember',
  ];
  const monthNamesShort = [
    'Jan',
    'Feb',
    'Mär',
    'Apr',
    'Mai',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Okt',
    'Nov',
    'Dez',
  ];

  result = result.replace(/\[%MONAT%\]/g, monthNames[currentMonth - 1]);
  result = result.replace(/\[%AKTUELLER_MONAT%\]/g, monthNames[currentMonth - 1]);
  result = result.replace(/\[%MONAT\.KURZ%\]/g, monthNamesShort[currentMonth - 1]);
  result = result.replace(/\[%MONAT\.ZAHL%\]/g, currentMonth.toString().padStart(2, '0'));

  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  result = result.replace(/\[%VORMONAT%\]/g, monthNames[prevMonth - 1]);
  result = result.replace(/\[%VORMONAT\.KURZ%\]/g, monthNamesShort[prevMonth - 1]);
  result = result.replace(/\[%VORMONAT\.ZAHL%\]/g, prevMonth.toString().padStart(2, '0'));
  result = result.replace(/\[%FOLGEMONAT%\]/g, monthNames[nextMonth - 1]);
  result = result.replace(/\[%FOLGEMONAT\.KURZ%\]/g, monthNamesShort[nextMonth - 1]);
  result = result.replace(/\[%FOLGEMONAT\.ZAHL%\]/g, nextMonth.toString().padStart(2, '0'));

  // Tag-Platzhalter
  result = result.replace(/\[%TAG%\]/g, currentDay.toString().padStart(2, '0'));

  const dayNames = [
    'Sonntag',
    'Montag',
    'Dienstag',
    'Mittwoch',
    'Donnerstag',
    'Freitag',
    'Samstag',
  ];
  result = result.replace(/\[%WOCHENTAG%\]/g, dayNames[now.getDay()]);

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  result = result.replace(/\[%DATUM\.VORTAG%\]/g, yesterday.toLocaleDateString('de-DE'));
  result = result.replace(/\[%WOCHENTAG\.VORTAG%\]/g, dayNames[yesterday.getDay()]);

  // Quartal-Platzhalter
  result = result.replace(/\[%QUARTAL%\]/g, currentQuarter.toString());
  result = result.replace(
    /\[%VORQUARTAL%\]/g,
    (currentQuarter === 1 ? 4 : currentQuarter - 1).toString()
  );
  result = result.replace(
    /\[%FOLGEQUARTAL%\]/g,
    (currentQuarter === 4 ? 1 : currentQuarter + 1).toString()
  );

  // Kalenderwoche
  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };
  result = result.replace(/\[%KALENDERWOCHE%\]/g, getWeekNumber(now).toString());

  // Anzahl Tage im Monat
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  result = result.replace(/\[%ANZAHL\.TAGE\.MONAT%\]/g, daysInMonth.toString());

  // Mehrsprachige Standard-Texte für alle Dokumenttypen
  const standardTexts = {
    de: {
      // Angebote (Quotes)
      quoteIntro:
        'vielen Dank für Ihre Anfrage! Hiermit unterbreiten wir Ihnen gerne unser Angebot für die folgenden Leistungen:',
      quoteClosing:
        'Dieses Angebot ist gültig bis [%GUELTIG_BIS%]. Bei Annahme unseres Angebots erstellen wir Ihnen gerne eine entsprechende Rechnung. Für Rückfragen stehen wir Ihnen jederzeit zur Verfügung.',
      // Rechnungen (Invoices)
      invoiceIntro:
        'vielen Dank für Ihren Auftrag und das damit verbundene Vertrauen! Hiermit stelle ich Ihnen die folgenden Leistungen in Rechnung:',
      invoiceClosing:
        'Bitte überweisen Sie den Rechnungsbetrag unter Angabe der Rechnungsnummer auf das unten angegebene Konto. Der Rechnungsbetrag ist bis zum [%ZAHLUNGSZIEL%] fällig.',
      // Mahnungen (Reminders)
      reminderIntro: 'wir stellen fest, dass die nachstehende Rechnung noch nicht beglichen wurde:',
      reminderClosing:
        'Wir bitten um umgehende Begleichung des offenen Betrages. Sollten Sie bereits gezahlt haben, betrachten Sie diese Mahnung als gegenstandslos.',
      // Lieferscheine (Delivery Notes)
      deliveryNoteIntro:
        'hiermit übersenden wir Ihnen den Lieferschein für die folgenden Artikel:',
      deliveryNoteClosing:
        'Bitte prüfen Sie die gelieferte Ware auf Vollständigkeit und Unversehrtheit. Reklamationen melden Sie uns bitte innerhalb von 14 Tagen.',
      // Auftragsbestätigungen (Order Confirmations)
      orderConfirmationIntro:
        'vielen Dank für Ihren Auftrag! Hiermit bestätigen wir die Bestellung der folgenden Leistungen:',
      orderConfirmationClosing:
        'Die voraussichtliche Lieferung erfolgt am [%LIEFERDATUM%]. Bei Fragen stehen wir Ihnen gerne zur Verfügung.',
      // Allgemeine Grußformeln
      bestRegards: 'Mit freundlichen Grüßen',
    },
    en: {
      // Angebote (Quotes)
      quoteIntro:
        'thank you for your inquiry! We are pleased to submit our quote for the following services:',
      quoteClosing:
        'This quote is valid until [%GUELTIG_BIS%]. Upon acceptance of our quote, we will be happy to issue you a corresponding invoice. Please feel free to contact us if you have any questions.',
      // Rechnungen (Invoices)
      invoiceIntro:
        'thank you for your order and the trust you have placed in us! I hereby invoice you for the following services:',
      invoiceClosing:
        'Please transfer the invoice amount to the account specified below, quoting the invoice number. The invoice amount is due by [%ZAHLUNGSZIEL%].',
      // Mahnungen (Reminders)
      reminderIntro: 'we note that the following invoice has not yet been settled:',
      reminderClosing:
        'We ask for prompt settlement of the outstanding amount. If you have already paid, please disregard this reminder.',
      // Lieferscheine (Delivery Notes)
      deliveryNoteIntro:
        'please find enclosed the delivery note for the following items:',
      deliveryNoteClosing:
        'Please check the delivered goods for completeness and damage. Please report any complaints within 14 days.',
      // Auftragsbestätigungen (Order Confirmations)
      orderConfirmationIntro:
        'thank you for your order! We hereby confirm the order for the following services:',
      orderConfirmationClosing:
        'The expected delivery date is [%LIEFERDATUM%]. Please do not hesitate to contact us if you have any questions.',
      // Allgemeine Grußformeln
      bestRegards: 'Best regards',
    },
    fr: {
      // Angebote (Quotes)
      quoteIntro:
        'merci pour votre demande! Nous avons le plaisir de vous soumettre notre devis pour les services suivants:',
      quoteClosing:
        "Ce devis est valable jusqu'au [%GUELTIG_BIS%]. En cas d'acceptation de notre devis, nous vous établirons volontiers une facture correspondante. Nous restons à votre disposition pour toute question.",
      // Rechnungen (Invoices)
      invoiceIntro:
        'merci pour votre commande et la confiance que vous nous accordez! Je vous facture par la présente les services suivants:',
      invoiceClosing:
        'Veuillez virer le montant de la facture sur le compte indiqué ci-dessous en mentionnant le numéro de facture. Le montant de la facture est dû au [%ZAHLUNGSZIEL%].',
      // Mahnungen (Reminders)
      reminderIntro: "nous constatons que la facture suivante n'a pas encore été réglée:",
      reminderClosing:
        'Nous vous demandons de régler rapidement le montant en souffrance. Si vous avez déjà payé, veuillez considérer ce rappel comme sans objet.',
      // Lieferscheine (Delivery Notes)
      deliveryNoteIntro:
        'veuillez trouver ci-joint le bon de livraison pour les articles suivants:',
      deliveryNoteClosing:
        'Veuillez vérifier la marchandise livrée pour sa complétude et son intégrité. Veuillez nous signaler toute réclamation dans un délai de 14 jours.',
      // Auftragsbestätigungen (Order Confirmations)
      orderConfirmationIntro:
        'merci pour votre commande! Nous confirmons par la présente la commande pour les services suivants:',
      orderConfirmationClosing:
        'La livraison prévue aura lieu le [%LIEFERDATUM%]. Nous restons à votre disposition pour toute question.',
      // Allgemeine Grußformeln
      bestRegards: 'Meilleures salutations',
    },
  };

  const langTexts = standardTexts[language as keyof typeof standardTexts] || standardTexts['de'];

  // Dynamische Ersetzung basierend auf verfügbaren Platzhaltern
  result = result.replace(/\[%QUOTE_INTRO_TEXT%\]/g, langTexts.quoteIntro);
  result = result.replace(/\[%QUOTE_CLOSING_TEXT%\]/g, langTexts.quoteClosing);
  result = result.replace(/\[%INVOICE_INTRO_TEXT%\]/g, langTexts.invoiceIntro);
  result = result.replace(/\[%INVOICE_CLOSING_TEXT%\]/g, langTexts.invoiceClosing);
  result = result.replace(/\[%REMINDER_INTRO_TEXT%\]/g, langTexts.reminderIntro);
  result = result.replace(/\[%REMINDER_CLOSING_TEXT%\]/g, langTexts.reminderClosing);
  result = result.replace(/\[%DELIVERY_NOTE_INTRO_TEXT%\]/g, langTexts.deliveryNoteIntro);
  result = result.replace(/\[%DELIVERY_NOTE_CLOSING_TEXT%\]/g, langTexts.deliveryNoteClosing);
  result = result.replace(/\[%ORDER_CONFIRMATION_INTRO_TEXT%\]/g, langTexts.orderConfirmationIntro);
  result = result.replace(/\[%ORDER_CONFIRMATION_CLOSING_TEXT%\]/g, langTexts.orderConfirmationClosing);
  result = result.replace(/\[%BESTREGARDS%\]/g, langTexts.bestRegards);

  // *** ZWEITE ERSETZUNGSRUNDE FÜR PLATZHALTER IN STANDARDTEXTEN ***
  // Nach dem Ersetzen von Standardtexten können neue Platzhalter aufgetaucht sein
  // Diese müssen nochmal ersetzt werden

  // Gültigkeitsdatum nochmal ersetzen (falls durch Standardtexte eingefügt)
  result = result.replace(/\[%GUELTIG_BIS%\]/g, formattedDueDate);
  result = result.replace(/\[%GULTIG_BIS%\]/g, formattedDueDate);
  result = result.replace(/\[%FAELLIGKEITSDATUM%\]/g, formattedDueDate);

  // Zahlungsziel nochmal ersetzen (falls durch Standardtexte eingefügt)
  // Verwende die gleiche verbesserte Logik wie calculatePaymentDue
  const calculatePaymentDue2 = () => {
    // Wenn bereits ein formatiertes Fälligkeitsdatum vorhanden ist, verwende dieses
    if (formattedDueDate) {
      return formattedDueDate;
    }
    
    const baseDate = data.documentDate ? new Date(data.documentDate) : new Date();
    
    // Extrahiere die Anzahl der Tage aus dem paymentTerms-Text
    let days = 14;
    if (data.paymentTerms) {
      const paymentTermsStr = String(data.paymentTerms);
      const match = paymentTermsStr.match(/(\d+)\s*Tage/i);
      if (match) {
        days = parseInt(match[1], 10);
      } else {
        const parsed = parseInt(paymentTermsStr, 10);
        if (!isNaN(parsed)) {
          days = parsed;
        }
      }
    }
    
    if (isNaN(days) || days <= 0) {
      days = 14;
    }

    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + days);
    return dueDate.toLocaleDateString('de-DE');
  };
  result = result.replace(/\[%ZAHLUNGSZIEL%\]/g, calculatePaymentDue2());

  // Zeilenumbrüche für HTML konvertieren
  result = result.replace(/\n/g, '<br>');

  return result;
}

export type { PlaceholderData };
