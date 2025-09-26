import React from 'react';
import type { CompanySettings, TemplateCustomizations } from '../types';
import { resolveLogoUrl } from '../utils/logoUtils';
import { InvoiceFooter } from './InvoiceFooter';

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
  documentType?: 'quote' | 'invoice' | 'storno' | 'reminder';
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

  // TSE-Daten (Technische Sicherheitseinrichtung) - Legacy Format
  tse?: {
    fn?: string; // Finanzamtnummer
    startD?: string; // Startdatum
    finishD?: string; // Enddatum
    serial?: string; // Seriennummer
    signCnt?: number; // Signaturzähler
    sign?: string; // Digitale Signatur
    code?: string; // TSE-Code
    sq?: string; // Sequential Number
    qrCode?: string; // QR-Code
  };
  // TSE-Daten (Technische Sicherheitseinrichtung) - Neues Format
  tseData?: {
    serialNumber: string;
    signatureAlgorithm: string;
    transactionNumber: string;
    startTime: string;
    finishTime: string;
    signature: string;
    publicKey: string;
    certificateSerial: string;
  };
  skontoText?: string;
  skontoDays?: number;
  skontoPercentage?: number;
  reverseCharge?: boolean;
  taxRule?: string;
  status?: string;
  isSmallBusiness?: boolean;
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

  return (
    <div
      className={`${preview ? 'max-w-[210mm] mx-auto' : 'w-full'} bg-white px-0 py-2 font-sans text-sm flex flex-col min-h-0 print:min-h-[297mm] print:h-[297mm] print:w-[210mm] print:max-w-[210mm] print:mx-auto`}
    >
      {/* Header - bleibt oben */}
      <div className="flex-shrink-0 mb-3 pb-2 border-b-2 border-gray-300 print:mb-4">
        <div className="grid grid-cols-2 gap-8">
          {/* Links: Kundendaten */}
          <div>
            <h1 className="text-xl font-bold text-gray-800 mb-1">{getDocumentTitle(data)}</h1>
            <div className="mb-2">
              <div className="text-sm">
                <div className="font-semibold">{data.customer?.name || 'Kunde'}</div>
                {data.customer?.address?.street && <div>{data.customer.address.street}</div>}
                {(data.customer?.address?.zipCode || data.customer?.address?.city) && (
                  <div>
                    {data.customer.address.zipCode} {data.customer.address.city}
                  </div>
                )}
                {data.customer?.address?.country &&
                  data.customer.address.country !== 'Deutschland' && (
                    <div>{data.customer.address.country}</div>
                  )}
              </div>
            </div>
            <div className="text-sm space-y-1">
              <div>
                <strong>Rechnungsnummer:</strong> {data.documentNumber}
              </div>
              <div>
                <strong>Rechnungsdatum:</strong> {formatDate(data.date)}
              </div>
              {data.dueDate && (
                <div>
                  <strong>Fälligkeitsdatum:</strong> {formatDate(data.dueDate)}
                </div>
              )}
            </div>
          </div>

          {/* Rechts: Logo und Firmendaten */}
          <div className="text-right">
            {showLogo && logoUrl && (
              <img
                src={logoUrl}
                alt={`${data.company?.name || 'Company'} Logo`}
                className="h-24 w-auto ml-auto mb-4 object-contain"
              />
            )}
            <div className="text-right">
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                {data.company?.name || 'Company Name'}
              </h2>
              <div className="text-gray-600 text-sm">
                <p>{data.company?.address?.street}</p>
                <p>
                  {data.company?.address?.zipCode} {data.company?.address?.city}
                </p>
                {data.company?.phone && <p className="mt-2">{data.company?.phone}</p>}
                {data.company?.email && <p>{data.company?.email}</p>}
                {data.company?.website && <p>{data.company?.website}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content - nimmt verfügbaren Platz */}
      <div className="flex-1 flex flex-col print:flex-1 print:min-h-0">
        {/* Mehr Optionen / Auswahlfelder */}
        {((data.currency && data.currency !== 'EUR') ||
          (data.contactPersonName && data.contactPersonName.trim() !== '') ||
          (data.deliveryTerms && data.deliveryTerms.trim() !== '') ||
          (data.skontoText && data.skontoText.trim() !== '') ||
          (data.skontoDays && data.skontoDays > 0) ||
          (data.skontoPercentage && data.skontoPercentage > 0) ||
          (typeof data.reverseCharge !== 'undefined' && data.reverseCharge !== false) ||
          data.isSmallBusiness) && (
          <div className="mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                {data.currency && data.currency !== 'EUR' && (
                  <div className="text-gray-600 text-xs mb-1">
                    Währung: <span className="font-semibold">{data.currency}</span>
                  </div>
                )}
                {data.contactPersonName && data.contactPersonName.trim() !== '' && (
                  <div className="text-gray-600 text-xs mb-1">
                    Kontaktperson: <span className="font-semibold">{data.contactPersonName}</span>
                  </div>
                )}
                {data.deliveryTerms && data.deliveryTerms.trim() !== '' && (
                  <div className="text-gray-600 text-xs mb-1">
                    Lieferbedingung: <span className="font-semibold">{data.deliveryTerms}</span>
                  </div>
                )}
                {(data.skontoText && data.skontoText.trim() !== '') ||
                (data.skontoDays && data.skontoDays > 0) ||
                (data.skontoPercentage && data.skontoPercentage > 0) ? (
                  <div className="text-gray-600 text-xs mb-1">
                    Skonto:{' '}
                    <span className="font-semibold">
                      {data.skontoText ? data.skontoText : ''}
                      {data.skontoDays && data.skontoDays > 0
                        ? ` Bei Zahlung binnen ${data.skontoDays} Tagen`
                        : ''}
                      {data.skontoPercentage && data.skontoPercentage > 0
                        ? ` ${data.skontoPercentage}%`
                        : ''}
                    </span>
                  </div>
                ) : null}
              </div>
              <div>
                {typeof data.reverseCharge !== 'undefined' && data.reverseCharge !== false && (
                  <div className="text-gray-600 text-xs mb-1">
                    Reverse Charge: <span className="font-semibold">aktiviert</span>
                  </div>
                )}
                {data.isSmallBusiness && (
                  <div className="text-gray-600 text-xs mb-1">
                    Kleinunternehmerregelung (§19 UStG)
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Kopftext / Header-Text */}
        {(data.description || data.introText || data.headerText) && (
          <div className="mb-6">
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
        <div className="flex flex-row justify-between mb-4 gap-4">
          {/* Linke Spalte: Währung, Zahlungsbedingung, Steuerregel */}
          <div className="flex flex-col text-sm text-gray-700 min-w-[220px]">
            {/* Währung, Kontaktperson und Zahlungsbedingung werden nur oben im Optionen-Block angezeigt */}
            {(data as any).taxRule && (
              <div className="mb-2">
                <span className="font-semibold">Steuerregel:</span>{' '}
                {(data as any).taxRuleLabel || (data as any).taxRule}
              </div>
            )}
            {data.paymentTerms && (
              <div>
                <span className="font-semibold">Zahlungsziel:</span> {data.paymentTerms}
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
                  <span>Gesamtbetrag:</span>
                  <span>{formatCurrency(data.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Text aus der Rechnung */}
        {(data as any).footerText && (
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <div
              className="text-sm text-gray-700 leading-relaxed"
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
                  .replace(/Zahlungsziel:/g, '<br><br><strong>Zahlungsziel:</strong>')
                  .replace(/Rechnungsdatum:/g, '<br><strong>Rechnungsdatum:</strong>')
                  .replace(/Vielen Dank/g, '<br>Vielen Dank')
                  .replace(/Mit freundlichen Grüßen/g, '<br>Mit freundlichen Grüßen<br>'),
              }}
            />
          </div>
        )}

        {/* TSE Daten falls vorhanden */}
        {data.tse && (
          <div className="mt-6 p-4 bg-gray-50 rounded border">
            <h3 className="text-sm font-bold text-gray-800 mb-3">
              Technische Sicherheitseinrichtung (TSE)
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              {data.tse.serial && (
                <div>
                  <span className="font-medium text-gray-600">Seriennummer:</span>
                  <div className="font-mono">{data.tse.serial}</div>
                </div>
              )}
              {data.tse.startD && (
                <div>
                  <span className="font-medium text-gray-600">Startdatum:</span>
                  <div>{data.tse.startD}</div>
                </div>
              )}
              {data.tse.finishD && (
                <div>
                  <span className="font-medium text-gray-600">Enddatum:</span>
                  <div>{data.tse.finishD}</div>
                </div>
              )}
              {data.tse.signCnt !== undefined && (
                <div>
                  <span className="font-medium text-gray-600">Signaturzähler:</span>
                  <div>{data.tse.signCnt}</div>
                </div>
              )}
              {data.tse.sign && (
                <div className="col-span-2">
                  <span className="font-medium text-gray-600">Signatur:</span>
                  <div className="font-mono text-xs break-all">{data.tse.sign}</div>
                </div>
              )}
            </div>

            {/* QR-Code */}
            {data.tse.qrCode && (
              <div className="mt-4 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-xs font-medium text-gray-600 mb-2">TSE QR-Code</div>
                  <img
                    src={data.tse.qrCode}
                    alt="TSE QR-Code"
                    className="w-24 h-24 border border-gray-300"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TSE Daten (neues Format) falls vorhanden */}
        {data.tseData && (
          <div className="mt-6 p-4 bg-gray-50 rounded border">
            <h3 className="text-sm font-bold text-gray-800 mb-3">
              Technische Sicherheitseinrichtung (TSE)
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-medium text-gray-600">Seriennummer:</span>
                <div className="font-mono">{data.tseData.serialNumber}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Algorithmus:</span>
                <div>{data.tseData.signatureAlgorithm}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Transaktionsnummer:</span>
                <div>{data.tseData.transactionNumber}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Startzeit:</span>
                <div>{data.tseData.startTime}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Endzeit:</span>
                <div>{data.tseData.finishTime}</div>
              </div>
              <div className="col-span-2">
                <span className="font-medium text-gray-600">Signatur:</span>
                <div className="font-mono text-xs break-all">{data.tseData.signature}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer - Immer am Ende der A4-Seite */}
      <div className="mt-auto">
        <InvoiceFooter data={data as any} preview={preview} />
      </div>
    </div>
  );
};

export default ProfessionalBusinessTemplate;
