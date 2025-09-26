import React from 'react';
import type { CompanySettings, TemplateCustomizations } from '../types';
import { resolveLogoUrl } from '../utils/logoUtils';

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
}

// Hinweis: TemplateProps ist oben bereits mit companySettings/customizations definiert

/**
 * Professional Business Template - Klassisch, sauber, deutscher Standard
 */
export const ProfessionalBusinessTemplate: React.FC<TemplateProps> = ({
  data,
  companySettings,
  customizations,
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
    <div className="w-full bg-white px-0 py-2 font-sans text-sm flex flex-col print:min-h-0">
      {/* Header */}
      <div className="mb-3 pb-2 border-b-2 border-gray-300">
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
      {/* Mehr Optionen / Auswahlfelder (jetzt UNTER dem Kopftext) */}
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
      {/* FLEXIBLER CONTENT BEREICH - wächst mit Tabelle */}
      <div className="flex-1 flex flex-col">
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
      </div>{' '}
      {/* Ende des flexiblen Content-Bereichs */}
      {/* Footer Text aus der Rechnung */}
      {(data as any).footerText && (
        <div className="mt-6 mb-6">
          <div
            className="text-sm text-gray-600 leading-relaxed"
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
                // Zeilenumbruch nur bei "Mit freundlichen Grüßen" und Name
                .replace(/Mit freundlichen Grüßen/g, '<br>Mit freundlichen Grüßen<br>'),
            }}
          />
        </div>
      )}
      {/* 🔧 ABSCHLUSSTEXT - Direkt nach Gesamtsumme ohne Titel und grauen Hintergrund */}
      {(data.hinweise || data.additionalNotes || data.paymentNotes || data.conclusionText) && (
        <div className="mt-2 mb-4">
          <div className="text-sm text-gray-700 space-y-2">
            {data.hinweise && <div dangerouslySetInnerHTML={{ __html: data.hinweise }} />}
            {!data.hinweise && data.additionalNotes && (
              <div dangerouslySetInnerHTML={{ __html: data.additionalNotes }} />
            )}
            {!data.hinweise && !data.additionalNotes && data.paymentNotes && (
              <div dangerouslySetInnerHTML={{ __html: data.paymentNotes }} />
            )}
            {!data.hinweise &&
              !data.additionalNotes &&
              !data.paymentNotes &&
              data.conclusionText && (
                <div dangerouslySetInnerHTML={{ __html: data.conclusionText }} />
              )}
          </div>
        </div>
      )}
      {/* TSE-Daten (Technische Sicherheitseinrichtung) */}
      {(data.tse || data.tseData) && (
        <div className="mt-4 mb-3 border border-gray-300 rounded-lg p-3 bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">
            TSE-Daten (Technische Sicherheitseinrichtung)
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Seriennummer */}
            {(data.tse?.serial || data.tseData?.serialNumber) && (
              <div>
                <span className="font-medium text-gray-600">Seriennummer:</span>
                <div className="font-mono">{data.tse?.serial || data.tseData?.serialNumber}</div>
              </div>
            )}
            {/* Signatur-Algorithmus */}
            {data.tseData?.signatureAlgorithm && (
              <div>
                <span className="font-medium text-gray-600">Signatur-Algorithmus:</span>
                <div className="font-mono">{data.tseData.signatureAlgorithm}</div>
              </div>
            )}
            {/* Transaktionsnummer */}
            {data.tseData?.transactionNumber && (
              <div>
                <span className="font-medium text-gray-600">Transaktionsnummer:</span>
                <div className="font-mono">{data.tseData.transactionNumber}</div>
              </div>
            )}
            {/* Startzeit */}
            {(data.tse?.startD || data.tseData?.startTime) && (
              <div>
                <span className="font-medium text-gray-600">Startzeit:</span>
                <div className="font-mono">{data.tse?.startD || data.tseData?.startTime}</div>
              </div>
            )}
            {/* Endzeit */}
            {(data.tse?.finishD || data.tseData?.finishTime) && (
              <div>
                <span className="font-medium text-gray-600">Endzeit:</span>
                <div className="font-mono">{data.tse?.finishD || data.tseData?.finishTime}</div>
              </div>
            )}
            {/* Signatur */}
            {data.tseData?.signature && (
              <div>
                <span className="font-medium text-gray-600">Signatur:</span>
                <div className="font-mono text-xs truncate">{data.tseData.signature}</div>
              </div>
            )}
            {/* Öffentlicher Schlüssel */}
            {data.tseData?.publicKey && (
              <div>
                <span className="font-medium text-gray-600">Öffentlicher Schlüssel:</span>
                <div className="font-mono text-xs truncate">{data.tseData.publicKey}</div>
              </div>
            )}
            {/* Zertifikat-Seriennummer */}
            {data.tseData?.certificateSerial && (
              <div>
                <span className="font-medium text-gray-600">Zertifikat-Serial:</span>
                <div className="font-mono">{data.tseData.certificateSerial}</div>
              </div>
            )}
            {/* Legacy TSE-Felder für Rückwärtskompatibilität */}
            {data.tse?.fn && (
              <div>
                <span className="font-medium text-gray-600">FN:</span>
                <div className="font-mono">{data.tse.fn}</div>
              </div>
            )}
            {data.tse?.signCnt && (
              <div>
                <span className="font-medium text-gray-600">SignCnt:</span>
                <div className="font-mono">{data.tse.signCnt}</div>
              </div>
            )}
            {data.tse?.code && (
              <div>
                <span className="font-medium text-gray-600">Code:</span>
                <div className="font-mono">{data.tse.code}</div>
              </div>
            )}
            {data.tse?.sq && (
              <div>
                <span className="font-medium text-gray-600">SQ:</span>
                <div className="font-mono">{data.tse.sq}</div>
              </div>
            )}
            {data.tse?.sign && (
              <div className="col-span-2 md:col-span-4">
                <span className="font-medium text-gray-600">Sign:</span>
                <div className="font-mono text-xs break-all">{data.tse.sign}</div>
              </div>
            )}
          </div>

          {/* QR-Code */}
          {data.tse?.qrCode && (
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
      {/* FIXER FOOTER - immer am Ende */}
      <div className="pt-3 text-sm text-gray-700 mt-auto invoice-footer">
        {/* 🔧 ABSCHLUSSTEXT - Direkt nach Gesamtsumme ohne Titel und grauen Hintergrund */}
        {(data.hinweise || data.additionalNotes || data.paymentNotes || data.conclusionText) && (
          <div className="mt-2 mb-4">
            <div className="text-sm text-gray-700 space-y-2">
              {data.hinweise && <div dangerouslySetInnerHTML={{ __html: data.hinweise }} />}
              {!data.hinweise && data.additionalNotes && (
                <div dangerouslySetInnerHTML={{ __html: data.additionalNotes }} />
              )}
              {!data.hinweise && !data.additionalNotes && data.paymentNotes && (
                <div dangerouslySetInnerHTML={{ __html: data.paymentNotes }} />
              )}
              {!data.hinweise &&
                !data.additionalNotes &&
                !data.paymentNotes &&
                data.conclusionText && (
                  <div dangerouslySetInnerHTML={{ __html: data.conclusionText }} />
                )}
            </div>
          </div>
        )}

        {/* TSE-Daten (Technische Sicherheitseinrichtung) */}
        {(data.tse || data.tseData) && (
          <div className="mt-4 mb-3 border border-gray-300 rounded-lg p-3 bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">
              TSE-Daten (Technische Sicherheitseinrichtung)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {/* Seriennummer */}
              {(data.tse?.serial || data.tseData?.serialNumber) && (
                <div>
                  <span className="font-medium text-gray-600">Seriennummer:</span>
                  <div className="font-mono">{data.tse?.serial || data.tseData?.serialNumber}</div>
                </div>
              )}
              {/* Signatur-Algorithmus */}
              {data.tseData?.signatureAlgorithm && (
                <div>
                  <span className="font-medium text-gray-600">Signatur-Algorithmus:</span>
                  <div className="font-mono">{data.tseData.signatureAlgorithm}</div>
                </div>
              )}
              {/* Transaktionsnummer */}
              {data.tseData?.transactionNumber && (
                <div>
                  <span className="font-medium text-gray-600">Transaktionsnummer:</span>
                  <div className="font-mono">{data.tseData.transactionNumber}</div>
                </div>
              )}
              {/* Startzeit */}
              {(data.tse?.startD || data.tseData?.startTime) && (
                <div>
                  <span className="font-medium text-gray-600">Startzeit:</span>
                  <div className="font-mono">{data.tse?.startD || data.tseData?.startTime}</div>
                </div>
              )}
              {/* Endzeit */}
              {(data.tse?.finishD || data.tseData?.finishTime) && (
                <div>
                  <span className="font-medium text-gray-600">Endzeit:</span>
                  <div className="font-mono">{data.tse?.finishD || data.tseData?.finishTime}</div>
                </div>
              )}
              {/* Signatur */}
              {data.tseData?.signature && (
                <div>
                  <span className="font-medium text-gray-600">Signatur:</span>
                  <div className="font-mono text-xs truncate">{data.tseData.signature}</div>
                </div>
              )}
              {/* Öffentlicher Schlüssel */}
              {data.tseData?.publicKey && (
                <div>
                  <span className="font-medium text-gray-600">Öffentlicher Schlüssel:</span>
                  <div className="font-mono text-xs truncate">{data.tseData.publicKey}</div>
                </div>
              )}
              {/* Zertifikat-Seriennummer */}
              {data.tseData?.certificateSerial && (
                <div>
                  <span className="font-medium text-gray-600">Zertifikat-Serial:</span>
                  <div className="font-mono">{data.tseData.certificateSerial}</div>
                </div>
              )}
              {/* Legacy TSE-Felder für Rückwärtskompatibilität */}
              {data.tse?.fn && (
                <div>
                  <span className="font-medium text-gray-600">FN:</span>
                  <div className="font-mono">{data.tse.fn}</div>
                </div>
              )}
              {data.tse?.signCnt && (
                <div>
                  <span className="font-medium text-gray-600">SignCnt:</span>
                  <div className="font-mono">{data.tse.signCnt}</div>
                </div>
              )}
              {data.tse?.code && (
                <div>
                  <span className="font-medium text-gray-600">Code:</span>
                  <div className="font-mono">{data.tse.code}</div>
                </div>
              )}
              {data.tse?.sq && (
                <div>
                  <span className="font-medium text-gray-600">SQ:</span>
                  <div className="font-mono">{data.tse.sq}</div>
                </div>
              )}
              {data.tse?.sign && (
                <div className="col-span-2 md:col-span-4">
                  <span className="font-medium text-gray-600">Sign:</span>
                  <div className="font-mono text-xs break-all">{data.tse.sign}</div>
                </div>
              )}
            </div>

            {/* QR-Code */}
            {data.tse?.qrCode && (
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

        {/* Footer / Compliance */}
        <div className="border-t-2 border-gray-300 pt-3 text-sm text-gray-700 invoice-footer">
          <div className="text-center text-sm leading-relaxed">
            {(() => {
              const footerParts: string[] = [];

              // Firmenname mit Rechtsform (immer zuerst)
              let companyName = '';
              if (data.company?.name) {
                companyName = data.company.name;
              } else if ((data as any).companyName) {
                companyName = (data as any).companyName;
              }

              // Rechtsform anhängen falls vorhanden (step2 hat Vorrang!)
              const companyLegalForm =
                (data as any).step2?.legalForm || (data as any).legalForm || '';
              const companySuffix = (data as any).step2?.companySuffix || '';

              if (companyName) {
                if (companySuffix && !companyName.includes(companySuffix)) {
                  companyName = `${companyName} ${companySuffix}`;
                } else if (
                  companyLegalForm &&
                  !companyName.includes(companyLegalForm) &&
                  !companySuffix
                ) {
                  companyName = `${companyName} ${companyLegalForm}`;
                }
                footerParts.push(companyName);
              }

              // Adresse
              if (data.company?.address?.street) {
                footerParts.push(data.company.address.street);
              }
              if (data.company?.address?.zipCode && data.company?.address?.city) {
                footerParts.push(`${data.company.address.zipCode} ${data.company.address.city}`);
              }
              if (
                data.company?.address?.country &&
                data.company.address.country !== 'Deutschland'
              ) {
                footerParts.push(data.company.address.country);
              }

              // Telefon
              if (data.company?.phone) {
                footerParts.push(`Tel.: ${data.company.phone}`);
              }

              // E-Mail
              if (data.company?.email) {
                footerParts.push(`E-Mail: ${data.company.email}`);
              }

              // Website
              if (data.company?.website) {
                footerParts.push(`Web: ${data.company.website}`);
              }

              // IBAN
              if (data.company?.bankDetails?.iban) {
                footerParts.push(`IBAN: ${data.company.bankDetails.iban}`);
              }

              // BIC
              if (data.company?.bankDetails?.bic) {
                footerParts.push(`BIC: ${data.company.bankDetails.bic}`);
              }

              // USt-IdNr
              if (data.company?.vatId) {
                footerParts.push(`USt-IdNr.: ${data.company.vatId}`);
              }

              // Steuernr
              if (data.company?.taxNumber) {
                footerParts.push(`Steuernr.: ${data.company.taxNumber}`);
              }

              // Amtsgericht (aus step3.districtCourt in der Datenbank)
              if ((data as any).districtCourt) {
                footerParts.push(`Amtsgericht: ${(data as any).districtCourt}`);
              }

              // Handelsregister (aus step3.companyRegister in der Datenbank)
              if ((data as any).companyRegister) {
                footerParts.push(`Handelsregister: ${(data as any).companyRegister}`);
              }

              // Geschäftsführer (IMMER anzeigen wenn vorhanden - unabhängig von Rechtsform)
              // WICHTIG: step2.legalForm hat Vorrang vor legalForm!
              const legalForm = (
                (data as any).step2?.legalForm ||
                (data as any).legalForm ||
                ''
              ).toLowerCase();

              // GESCHÄFTSFÜHRER IMMER VERSUCHEN (nicht nur bei bestimmten Rechtsformen)
              {
                let directorName = '';

                // 1. Prüfe managingDirectors Array (direkt)
                if ((data as any).managingDirectors && (data as any).managingDirectors.length > 0) {
                  const mainDirector =
                    (data as any).managingDirectors.find((dir: any) => dir.isMainDirector) ||
                    (data as any).managingDirectors[0];
                  if (mainDirector && mainDirector.firstName && mainDirector.lastName) {
                    directorName = `${mainDirector.firstName} ${mainDirector.lastName}`;
                  }
                }

                // 2. Prüfe step1.managingDirectors Array
                if (
                  !directorName &&
                  (data as any).step1?.managingDirectors &&
                  (data as any).step1.managingDirectors.length > 0
                ) {
                  const mainDirector =
                    (data as any).step1.managingDirectors.find((dir: any) => dir.isMainDirector) ||
                    (data as any).step1.managingDirectors[0];
                  if (mainDirector && mainDirector.firstName && mainDirector.lastName) {
                    directorName = `${mainDirector.firstName} ${mainDirector.lastName}`;
                  }
                }

                // 3. Prüfe step1.personalData
                if (
                  !directorName &&
                  (data as any).step1?.personalData?.firstName &&
                  (data as any).step1?.personalData?.lastName
                ) {
                  directorName = `${(data as any).step1.personalData.firstName} ${(data as any).step1.personalData.lastName}`;
                }

                // 4. Fallback zu direkten personalData Feldern
                if (!directorName && (data as any).firstName && (data as any).lastName) {
                  directorName = `${(data as any).firstName} ${(data as any).lastName}`;
                }

                // Für GmbH, UG, AG, KG ist Geschäftsführer PFLICHT
                const requiresDirector =
                  legalForm.includes('gmbh') ||
                  legalForm.includes('ug') ||
                  legalForm.includes('ag') ||
                  legalForm.includes('kg');

                if (directorName.trim()) {
                  if (requiresDirector) {
                    footerParts.push(`Geschäftsführer: ${directorName.trim()}`);
                  } else {
                    footerParts.push(`Inhaber: ${directorName.trim()}`);
                  }
                }
              }

              return footerParts.join(' | ');
            })()}
          </div>
        </div>
      </div>{' '}
      {/* Ende des flexiblen Content-Bereichs */}
    </div>
  );
};

export default ProfessionalBusinessTemplate;
