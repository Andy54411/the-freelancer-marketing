import React from 'react';
import type { CompanySettings, TemplateCustomizations } from '../types';
import { InvoiceFooter } from './InvoiceFooter';
import QRCode from 'react-qr-code';

/**
 * Einfache Logo-URL Resolver Funktion
 */
function resolveLogoUrl(
  customizations?: TemplateCustomizations,
  companySettings?: CompanySettings,
  data?: any
): string | undefined {
  // Priorität: customizations > companySettings > data
  return (
    customizations?.logoUrl ||
    (companySettings as any)?.logo ||
    (companySettings as any)?.logoUrl ||
    data?.company?.logo ||
    data?.companyLogo ||
    data?.profilePictureURL ||
    undefined
  );
}

/**
 * Gibt den deutschen Text für eine Steuerregel zurück
 */
function getTaxRuleLabel(taxRule: string): string {
  switch (taxRule) {
    case 'DE_TAXABLE':
      return 'Steuerpflichtiger Umsatz (Regelsteuersatz 19 %, § 1 Abs. 1 Nr. 1 i.V.m. § 12 Abs. 1 UStG)';
    case 'DE_TAXABLE_REDUCED':
      return 'Steuerpflichtiger Umsatz (ermäßigter Steuersatz 7 %, § 12 Abs. 2 UStG)';
    case 'DE_REDUCED':
      return 'Steuerpflichtiger Umsatz (ermäßigter Steuersatz 7 %, § 1 Abs. 1 Nr. 1 i.V.m. § 12 Abs. 2 UStG)';
    case 'DE_EXEMPT':
    case 'DE_EXEMPT_4_USTG':
      return 'Steuerfreie Lieferung/Leistung gemäß § 4 UStG';
    case 'DE_SMALL_BUSINESS':
      return 'Umsatzsteuerbefreit nach § 19 UStG (Kleinunternehmerregelung)';
    case 'DE_REVERSE_CHARGE':
    case 'DE_REVERSE_13B':
      return 'Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG)';
    case 'EU_REVERSE_18B':
      return 'Steuerschuldnerschaft des Leistungsempfängers (Art. 196 MwStSystRL, § 18b UStG)';
    case 'EU_INTRACOMMUNITY_SUPPLY':
      return 'Innergemeinschaftliche Lieferung, steuerfrei gemäß § 4 Nr. 1b i.V.m. § 6a UStG';
    case 'EU_OSS':
      return 'Fernverkauf über das OSS-Verfahren (§ 18j UStG)';
    case 'NON_EU_EXPORT':
      return 'Steuerfreie Ausfuhrlieferung (§ 4 Nr. 1a i.V.m. § 6 UStG)';
    case 'NON_EU_OUT_OF_SCOPE':
      return 'Nicht im Inland steuerbare Leistung (Leistungsort außerhalb Deutschlands, § 3a Abs. 2 UStG)';
    case 'DE_INTRACOMMUNITY':
      return 'Innergemeinschaftliche Lieferung (§ 4 Nr. 1b UStG)';
    case 'DE_EXPORT':
      return 'Ausfuhrlieferung (§ 4 Nr. 1a UStG)';
    default:
      return taxRule;
  }
}

// Hilfsfunktion für dynamische Dokumenttitel
function getDocumentTitle(data: any): string {
  // 1. Explizit gesetzter Titel hat höchste Priorität
  if (data.documentTitle) {
    return data.documentTitle;
  }

  // 2. Basierend auf documentType
  if (data.documentType) {
    switch (data.documentType) {
      case 'quote':
        return 'Angebot';
      case 'invoice':
        return 'Rechnung';
      case 'storno':
        return 'STORNO-RECHNUNG';
      case 'reminder':
        return 'Mahnung';
      case 'voucher':
      case 'gutschein':
        return 'Gutschein';
      case 'delivery_note':
      case 'lieferschein':
        return 'Lieferschein';
      case 'proforma':
        return 'Proforma-Rechnung';
      case 'credit_note':
      case 'gutschrift':
        return 'Gutschrift';
      case 'order_confirmation':
      case 'auftragsbestaetigung':
        return 'Auftragsbestätigung';
      case 'cost_estimate':
      case 'kostenvoranschlag':
        return 'Kostenvoranschlag';
      default:
        return 'Dokument';
    }
  }

  // 3. Fallback basierend auf isStorno Flag
  if (data.isStorno) {
    return 'STORNO-RECHNUNG';
  }

  // 4. Standard-Fallback
  return 'Rechnung';
}

export interface TemplateData {
  // Dokumentinformationen
  documentNumber: string;
  date: string;
  dueDate: string;

  // Dokumenttyp und Titel
  documentType?:
    | 'quote'
    | 'invoice'
    | 'storno'
    | 'reminder'
    | 'voucher'
    | 'gutschein'
    | 'delivery_note'
    | 'lieferschein'
    | 'proforma'
    | 'credit_note'
    | 'gutschrift'
    | 'order_confirmation'
    | 'auftragsbestaetigung'
    | 'cost_estimate'
    | 'kostenvoranschlag';
  documentTitle?: string;

  // Leistungszeitraum
  serviceDate?: string;
  servicePeriod?: string;

  // Kundendaten
  customer?: {
    name: string;
    email: string;
    address: {
      street: string;
      zipCode: string;
      city: string;
      country: string;
    };
    taxNumber?: string;
    vatId?: string;
  };

  // Unternehmensdaten
  company?: {
    name: string;
    email: string;
    phone: string;
    website?: string;
    address?: {
      street: string;
      zipCode: string;
      city: string;
      country: string;
    };
    taxNumber?: string;
    vatId?: string;
    bankDetails?: {
      iban: string;
      bic: string;
      accountHolder: string;
    };
  };

  // Rechnungsposten
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
    discountPercent: number;
    discount: number;
  }>;

  // Beträge
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;

  // Optionale Felder
  currency?: string;
  description?: string;
  introText?: string;
  headerText?: string;
  notes?: string;
  hinweise?: string;
  additionalNotes?: string;
  paymentNotes?: string;
  conclusionText?: string;
  paymentTerms?: string;
  taxRuleLabel?: string;

  // Zusätzliche Optionen
  contactPersonName?: string;
  deliveryTerms?: string;

  // Skonto und Zahlungsbedingungen
  skontoEnabled?: boolean;
  skontoText?: string;
  skontoDays?: number;
  skontoPercentage?: number;
  reverseCharge?: boolean;
  taxRule?: string;
  status?: string;
  isSmallBusiness?: boolean;

  // E-Rechnung Daten - Legacy Format
  eInvoice?: {
    format?: string;
    version?: string;
    guid?: string;
    xmlContent?: string;
  };

  // E-Rechnung Daten - Neues Format
  eInvoiceData?: {
    format: string;
    version: string;
    guid: string;
    xmlUrl?: string;
    validationStatus?: 'valid' | 'invalid' | 'pending';
    createdAt: string;
  };

  // Referenznummer
  reference?: string;
}
interface TemplateProps {
  data: TemplateData;
  companySettings?: CompanySettings;
  customizations?: TemplateCustomizations;
  preview?: boolean;
}

/**
 * Professional Business Template - Klassisch, sauber, deutscher Standard
 */
export const ProfessionalBusinessTemplate: React.FC<TemplateProps> = ({
  data,
  companySettings,
  customizations,
  preview = false,
}) => {
  console.log(
    'DEBUG ProfessionalBusinessTemplate received data at',
    new Date().toISOString(),
    ':',
    {
      servicePeriod: data.servicePeriod,
      serviceDate: data.serviceDate,
      deliveryDateType: (data as any).deliveryDateType,
      deliveryDateRange: (data as any).deliveryDateRange,
      hasServicePeriod: !!data.servicePeriod,
      hasServiceDate: !!data.serviceDate,
    }
  );
  const logoUrl = resolveLogoUrl(customizations, companySettings, data);
  const showLogo = customizations?.showLogo ?? true;
  // DIN 5008: deutsches Datumsformat und Währungsformat verwenden
  const formatDate = (input: string) => {
    const d = new Date(input);
    return isNaN(d.getTime()) ? input : d.toLocaleDateString('de-DE');
  };
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  const serviceText =
    data.servicePeriod || (data.serviceDate ? formatDate(data.serviceDate) : formatDate(data.date));

  // Hilfsfunktion zum Bereinigen der Straße - robuster
  const cleanStreet = (street: string) => {
    if (!street) return '';
    console.log('DEBUG cleanStreet input:', JSON.stringify(street));
    // Extrem aggressive Bereinigung
    const cleaned = street
      .replace(/<br\s*\/?>/gi, ' ') // HTML <br> Tags
      .replace(/\r\n/g, ' ') // Windows Zeilenumbrüche
      .replace(/\n/g, ' ') // Unix Zeilenumbrüche
      .replace(/\r/g, ' ') // Mac Zeilenumbrüche
      .replace(/\t/g, ' ') // Tabs
      .replace(/\f/g, ' ') // Form feeds
      .replace(/\v/g, ' ') // Vertical tabs
      .replace(/\s+/g, ' ') // Mehrere Leerzeichen
      .trim(); // Trim
    console.log('DEBUG cleanStreet output:', JSON.stringify(cleaned));
    return cleaned;
  };

  // QR-Code Daten für E-Invoice generieren
  const generateEInvoiceQRData = () => {
    const guid = data.eInvoiceData?.guid || data.eInvoice?.guid;
    if (!guid) return '';

    // Verwende immer die Produktions-URL für QR-Codes
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.taskilo.com';
    return `${baseUrl}/api/einvoices/${guid}/xml`;
  };

  return (
    <>
      <style jsx>{`
        @media print {
          .invoice-container {
            transform: scale(1) !important;
            transform-origin: top left !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 1mm !important;
            box-sizing: border-box !important;
            height: 285mm !important;
            max-height: 285mm !important;
          }
        }
      `}</style>
      <div
        className={`invoice-container ${preview ? 'max-w-[210mm] mx-auto' : 'w-full'} bg-white p-0 font-sans text-sm flex flex-col print:min-h-[297mm] print:w-[210mm] print:max-w-[210mm] print:mx-auto print:p-0 relative`}
      >
        {/* Logo absolut positioniert - ganz oben mittig */}
        {showLogo && logoUrl && (
          <div className="w-full flex justify-center mb-4">
            <img
              src={logoUrl}
              alt={`${data.company?.name || 'Company'} Logo`}
              className="h-24 w-auto object-contain"
            />
          </div>
        )}

        {/* Header - Grid mit 2 Spalten */}
        <div className="flex-shrink-0 mb-2 pb-1 border-b-2 border-gray-300 print:mb-3 print:pb-2 relative">
          <div className="grid grid-cols-2 gap-8">
            {/* Links: Überschrift, Firmenadresse, Kundendaten */}
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-0.5">{getDocumentTitle(data)}</h1>

              {/* Firmenadresse in einer Zeile */}
              <div className="text-xs text-gray-600 mb-3" style={{ fontSize: '12px' }}>
                {data.company?.name &&
                  data.company?.address?.street &&
                  data.company?.address?.zipCode &&
                  data.company?.address?.city && (
                    <div className="font-medium">
                      {(() => {
                        // Vollständiger Firmenname mit Suffix
                        const companyName = data.company.name;
                        const companySuffix =
                          (data as any).companySuffix || (data as any).step2?.companySuffix;
                        const fullCompanyName = companySuffix
                          ? `${companyName} ${companySuffix}`
                          : companyName;
                        return `${fullCompanyName} | ${cleanStreet(data.company.address.street)} | ${data.company.address.zipCode} ${data.company.address.city}`;
                      })()}
                    </div>
                  )}
              </div>

              <div className="mb-2">
                <div className="text-sm">
                  <div className="font-semibold">{data.customer?.name || 'Kunde'}</div>
                  {data.customer?.address?.street && (
                    <div>{cleanStreet(data.customer.address.street)}</div>
                  )}
                  <div>
                    {data.customer?.address?.zipCode || ''} {data.customer?.address?.city || ''}
                  </div>
                  <div>Deutschland</div>
                  {((data as any).customerVatId ||
                    data.customer?.vatId ||
                    data.customer?.taxNumber) && (
                    <div className="mt-1 text-xs text-gray-600">
                      {((data as any).customerVatId || data.customer?.vatId) &&
                        `VAT: ${(data as any).customerVatId || data.customer?.vatId}`}
                      {((data as any).customerVatId || data.customer?.vatId) &&
                        data.customer?.taxNumber &&
                        ' / '}
                      {data.customer?.taxNumber && `Steuernummer: ${data.customer?.taxNumber}`}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rechts: Dokumentinformationen auf der Trennlinie */}
            <div className="text-right absolute bottom-0 right-0 pb-1">
              <div className="text-sm space-y-1">
                <div>
                  <strong>
                    {(() => {
                      switch (data.documentType) {
                        case 'quote':
                          return 'Angebotsnummer:';
                        case 'reminder':
                          return 'Mahnungsnummer:';
                        case 'voucher':
                        case 'gutschein':
                          return 'Gutscheinnummer:';
                        case 'delivery_note':
                        case 'lieferschein':
                          return 'Lieferscheinnummer:';
                        case 'proforma':
                          return 'Proforma-Nr.:';
                        case 'credit_note':
                        case 'gutschrift':
                          return 'Gutschriftsnummer:';
                        case 'order_confirmation':
                        case 'auftragsbestaetigung':
                          return 'Auftragsnummer:';
                        case 'cost_estimate':
                        case 'kostenvoranschlag':
                          return 'Kostenvoranschlag-Nr.:';
                        case 'storno':
                          return 'Storno-Rechnungsnummer:';
                        default:
                          return 'Rechnungsnummer:';
                      }
                    })()}
                  </strong>{' '}
                  {data.documentNumber}
                </div>
                <div>
                  <strong>
                    {(() => {
                      switch (data.documentType) {
                        case 'quote':
                          return 'Angebotsdatum:';
                        case 'reminder':
                          return 'Mahnungsdatum:';
                        case 'voucher':
                        case 'gutschein':
                          return 'Gutscheindatum:';
                        case 'delivery_note':
                        case 'lieferschein':
                          return 'Lieferdatum:';
                        case 'proforma':
                          return 'Proforma-Datum:';
                        case 'credit_note':
                        case 'gutschrift':
                          return 'Gutschriftsdatum:';
                        case 'order_confirmation':
                        case 'auftragsbestaetigung':
                          return 'Auftragsdatum:';
                        case 'cost_estimate':
                        case 'kostenvoranschlag':
                          return 'Datum:';
                        case 'storno':
                          return 'Storno-Datum:';
                        default:
                          return 'Rechnungsdatum:';
                      }
                    })()}
                  </strong>{' '}
                  {formatDate(data.date)}
                </div>
                {data.dueDate &&
                  data.documentType &&
                  ![
                    'quote',
                    'voucher',
                    'gutschein',
                    'delivery_note',
                    'lieferschein',
                    'order_confirmation',
                    'auftragsbestaetigung',
                    'cost_estimate',
                    'kostenvoranschlag',
                  ].includes(data.documentType) && (
                    <div>
                      <strong>
                        {(() => {
                          switch (data.documentType) {
                            case 'reminder':
                              return 'Zahlungsziel:';
                            case 'proforma':
                              return 'Gültig bis:';
                            case 'credit_note':
                            case 'gutschrift':
                              return 'Gutschrift bis:';
                            default:
                              return 'Fälligkeitsdatum:';
                          }
                        })()}
                      </strong>{' '}
                      {formatDate(data.dueDate)}
                    </div>
                  )}
                {data.documentType === 'quote' && data.dueDate && (
                  <div>
                    <strong>Gültig bis:</strong> {formatDate(data.dueDate)}
                  </div>
                )}
                {(data.documentType === 'voucher' || data.documentType === 'gutschein') &&
                  data.dueDate && (
                    <div>
                      <strong>Gültig bis:</strong> {formatDate(data.dueDate)}
                    </div>
                  )}
                {/* Lieferzeitraum - direkt unter Fälligkeitsdatum */}
                {(data.servicePeriod || data.serviceDate) && (
                  <div>
                    <strong>{data.servicePeriod ? 'Lieferzeitraum:' : 'Lieferdatum:'}</strong>{' '}
                    {data.servicePeriod || (data.serviceDate ? formatDate(data.serviceDate) : '')}
                  </div>
                )}
                {data.contactPersonName && data.contactPersonName.trim() !== '' && (
                  <div>
                    <strong>Kontaktperson:</strong> {data.contactPersonName}
                  </div>
                )}
                {data.deliveryTerms && data.deliveryTerms.trim() !== '' && (
                  <div>
                    <strong>Lieferbedingung:</strong> {data.deliveryTerms}
                  </div>
                )}
                {data.isSmallBusiness && (
                  <div>
                    <strong>Kleinunternehmerregelung (§19 UStG)</strong>
                  </div>
                )}
                {data.reference && (
                  <div>
                    <strong>Referenz:</strong> {data.reference}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col print:flex-1 print:min-h-0">
          {/* Mehr Optionen / Auswahlfelder */}
          {((data.currency && data.currency !== 'EUR') ||
            (typeof data.reverseCharge !== 'undefined' && data.reverseCharge !== false)) && (
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  {data.currency && data.currency !== 'EUR' && (
                    <div className="text-gray-600 text-xs mb-1">
                      Währung: <span className="font-semibold">{data.currency}</span>
                    </div>
                  )}
                </div>
                <div>
                  {typeof data.reverseCharge !== 'undefined' && data.reverseCharge !== false && (
                    <div className="text-gray-600 text-xs mb-1">
                      Reverse Charge: <span className="font-semibold">aktiviert</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* Kopftext / Header-Text */}
          {(data.description || data.introText || data.headerText) && (
            <div className="mb-12">
              <div
                className="text-base text-gray-800 whitespace-pre-line"
                style={{ wordBreak: 'break-word' }}
              >
                {data.description && <div dangerouslySetInnerHTML={{ __html: data.description }} />}
                {!data.description && data.introText && (
                  <div dangerouslySetInnerHTML={{ __html: data.introText }} />
                )}
                {!data.description && !data.introText && data.headerText && (
                  <div dangerouslySetInnerHTML={{ __html: data.headerText }} />
                )}
              </div>
            </div>
          )}
          {/* Artikel Tabelle */}
          <div className="mb-4">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-3 text-left font-bold">Position</th>
                  <th className="border border-gray-300 p-3 text-left font-bold">Beschreibung</th>
                  <th className="border border-gray-300 p-3 text-center font-bold">Menge</th>
                  <th className="border border-gray-300 p-3 text-right font-bold">Einzelpreis</th>
                  {data.items &&
                  data.items.some(item => item.discountPercent > 0 || item.discount > 0) ? (
                    <th className="border border-gray-300 p-3 text-right font-bold">Rabatt</th>
                  ) : null}
                  <th className="border border-gray-300 p-3 text-right font-bold">Gesamtpreis</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 p-3 text-center">{index + 1}</td>
                    <td className="border border-gray-300 p-3">{item.description}</td>
                    <td className="border border-gray-300 p-3 text-center">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="border border-gray-300 p-3 text-right">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    {data.items &&
                    data.items.some(itm => itm.discountPercent > 0 || itm.discount > 0) ? (
                      <td className="border border-gray-300 p-3 text-right text-red-600">
                        {item.discountPercent > 0 || item.discount > 0
                          ? `${item.discountPercent > 0 ? item.discountPercent : item.discount}%`
                          : ''}
                      </td>
                    ) : null}
                    <td className="border border-gray-300 p-3 text-right font-semibold">
                      {(() => {
                        const discount =
                          item.discountPercent > 0
                            ? item.unitPrice * item.quantity * (item.discountPercent / 100)
                            : item.discount > 0
                              ? item.unitPrice * item.quantity * (item.discount / 100)
                              : 0;
                        const total = item.unitPrice * item.quantity - discount;
                        return formatCurrency(total);
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Summenbereich mit Infos links */}
          <div className="flex flex-row justify-between mt-6 mb-4 gap-4">
            {/* Linke Spalte: Währung, Zahlungsbedingung, Steuerregel und E-Invoice */}
            <div className="flex flex-col text-sm text-gray-700 min-w-[220px]">
              {/* Währung, Kontaktperson und Zahlungsbedingung werden nur oben im Optionen-Block angezeigt */}
              {(data as any).taxRule && (
                <div className="mb-2">
                  <span className="font-semibold">Steuerregel:</span>{' '}
                  {getTaxRuleLabel((data as any).taxRule)}
                </div>
              )}
              {/* Skonto-Informationen - Unter Steuerregel */}
              {data.skontoEnabled &&
              ((data.skontoText && data.skontoText.trim() !== '') ||
                (data.skontoDays && data.skontoDays > 0) ||
                (data.skontoPercentage && data.skontoPercentage > 0)) ? (
                <div className="mb-2">
                  <span className="font-semibold">Skonto:</span>{' '}
                  {data.skontoText ? data.skontoText : ''}
                  {data.skontoDays && data.skontoDays > 0
                    ? ` Bei Zahlung binnen ${data.skontoDays} Tagen`
                    : ''}
                  {data.skontoPercentage && data.skontoPercentage > 0
                    ? ` ${data.skontoPercentage}%`
                    : ''}
                </div>
              ) : null}
              {data.paymentTerms && (
                <div className="mb-3">
                  <span className="font-semibold">Zahlungsziel:</span> {data.paymentTerms}
                  {data.skontoEnabled &&
                  ((data.skontoText && data.skontoText.trim() !== '') ||
                    (data.skontoDays && data.skontoDays > 0) ||
                    (data.skontoPercentage && data.skontoPercentage > 0))
                    ? ` ohne Abzug ${data.skontoText || ''}`
                    : ''}
                </div>
              )}

              {/* E-Invoice Informationen - Unter Steuerregel und Zahlungsziel */}
              {(data.eInvoiceData?.guid || data.eInvoice?.guid) && (
                <div className="mt-2 p-2 bg-white rounded">
                  <div className="flex items-start gap-2">
                    {/* QR-Code kompakt */}
                    <div className="flex-shrink-0">
                      <div className="bg-white p-1 rounded border">
                        <QRCode
                          value={generateEInvoiceQRData()}
                          size={85}
                          style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                        />
                      </div>
                    </div>

                    {/* E-Invoice Details kompakt */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs space-y-0.5">
                        <div className="font-bold text-gray-800">E-Invoice</div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-gray-700">Format:</span>
                          <span className="truncate">{data.eInvoiceData?.format || 'zugferd'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-gray-700">Version:</span>
                          <span>{data.eInvoiceData?.version || '1.0'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-gray-700">Status:</span>
                          <span
                            className={`font-medium ${
                              data.eInvoiceData?.validationStatus === 'valid'
                                ? 'text-green-600'
                                : data.eInvoiceData?.validationStatus === 'invalid'
                                  ? 'text-red-600'
                                  : 'text-yellow-600'
                            }`}
                          >
                            {data.eInvoiceData?.validationStatus === 'valid'
                              ? '✓'
                              : data.eInvoiceData?.validationStatus === 'invalid'
                                ? '✗'
                                : '⏳'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-gray-700">GUID:</span>
                          <span className="font-mono text-xs">
                            {data.eInvoiceData?.guid || data.eInvoice?.guid}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Rechte Spalte: Summen */}
            <div className="w-80">
              <div className="space-y-2">
                <div className="flex justify-between py-2">
                  <span>Zwischensumme:</span>
                  <span>{formatCurrency(data.subtotal)}</span>
                </div>
                {data.taxRate > 0 && (
                  <div className="flex justify-between py-2">
                    <span>Umsatzsteuer ({data.taxRate}%):</span>
                    <span>{formatCurrency(data.taxAmount)}</span>
                  </div>
                )}
                <div className="border-t-2 border-gray-300 pt-2">
                  <div className="flex justify-between py-2 text-lg font-bold">
                    <span>
                      {(() => {
                        switch (data.documentType) {
                          case 'quote':
                            return 'Angebotssumme:';
                          case 'voucher':
                          case 'gutschein':
                            return 'Gutscheinwert:';
                          case 'credit_note':
                          case 'gutschrift':
                            return 'Gutschriftsbetrag:';
                          case 'cost_estimate':
                          case 'kostenvoranschlag':
                            return 'Geschätzte Kosten:';
                          default:
                            return 'Gesamtbetrag:';
                        }
                      })()}
                    </span>
                    <span>{formatCurrency(data.total)}</span>
                  </div>
                  {/* Skonto-Berechnung - Option 1: Vollständige Preisaufschlüsselung */}
                  {data.skontoEnabled &&
                    data.skontoPercentage &&
                    data.skontoPercentage > 0 &&
                    data.skontoDays &&
                    data.skontoDays > 0 && (
                      <div className="border-t border-gray-200 pt-2 space-y-1">
                        <div className="flex justify-between py-1 text-sm">
                          <span>
                            Skonto {data.skontoPercentage}% bei Zahlung binnen {data.skontoDays}{' '}
                            Tagen:
                          </span>
                          <span className="text-red-600">
                            - {formatCurrency(data.total * (data.skontoPercentage / 100))}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 text-base font-semibold border-t border-gray-100 pt-1">
                          <span>Zahlbetrag bei Skonto:</span>
                          <span className="text-green-600">
                            {formatCurrency(data.total * (1 - data.skontoPercentage / 100))}
                          </span>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>{' '}
          {/* Footer Text aus der Rechnung */}
          {(data as any).footerText && (
            <div className="mb-2 p-2 bg-gray-50 rounded">
              <div
                className="text-xs text-gray-700 leading-normal"
                dangerouslySetInnerHTML={{
                  __html: (data as any).footerText
                    .replace(/\[%GESAMTBETRAG%\]/g, formatCurrency(data.total))
                    .replace(/\[%RECHNUNGSNUMMER%\]/g, data.documentNumber)
                    .replace(/\[%ZAHLUNGSZIEL%\]/g, (data as any).paymentTerms || '')
                    .replace(/\[%RECHNUNGSDATUM%\]/g, formatDate(data.date))
                    .replace(
                      /\[%KONTAKTPERSON%\]/g,
                      (data as any).contactPersonName || data.company?.name || ''
                    )
                    .replace(/Zahlungsziel:/g, '<br><strong>Zahlungsziel:</strong>')
                    .replace(/Rechnungsdatum:/g, '<br><strong>Rechnungsdatum:</strong>')
                    .replace(/Vielen Dank/g, '<br>Vielen Dank')
                    .replace(/Mit freundlichen Grüßen/g, '<br>Mit freundlichen Grüßen'),
                }}
              />
            </div>
          )}
        </div>

        {/* Footer - Immer am Ende der A4-Seite */}
        <div className="mt-auto print:mt-2">
          <InvoiceFooter data={data as any} preview={preview} />
        </div>
      </div>
    </>
  );
};

export default ProfessionalBusinessTemplate;
