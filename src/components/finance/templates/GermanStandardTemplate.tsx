import React from 'react';
import { InvoiceData } from './types';
import { getProxiedImageUrl, isFirebaseStorageUrl } from '@/utils/imageProxy';
import { GermanMultiPageTemplate } from './GermanMultiPageTemplate';

interface TemplateProps {
  data: InvoiceData;
}

/**
 * Deutsche Standard-Rechnungsvorlage
 *
 * Features:
 * - UStG §14 konforme Pflichtangaben
 * - GoBD-zertifizierte Struktur
 * - Kleinunternehmerregelung Support
 * - Deutsche Steuerrecht-Compliance
 * - A4-Format (595px × 842px)
 * - Automatische Mehrseitigkeit bei vielen Positionen
 */
export const GermanStandardTemplate: React.FC<TemplateProps> = ({ data }) => {
  // Automatische Erkennung: Ab 15 Positionen mehrseitig
  const maxItemsPerPage = 15;
  const totalItems = data.items?.length || 0;
  const shouldUseMultiPage = totalItems > maxItemsPerPage;

  // Wenn mehrseitig nötig, lade das mehrseitige Template
  if (shouldUseMultiPage) {
    return <GermanMultiPageTemplate data={data} />;
  }
  return (
    <div
      data-invoice-template
      className="w-full max-w-full min-h-[842px] bg-white p-8 font-sans text-sm leading-normal flex flex-col mx-auto relative"
    >
      {/* Logo ganz oben */}
      <div className="flex justify-end mb-6">
        {data.companyLogo || data.profilePictureURL || (data as any).logo ? (
          <img
            src={(() => {
              const logoUrl = data.companyLogo || data.profilePictureURL || (data as any).logo;
              if (!logoUrl) return '';
              return isFirebaseStorageUrl(logoUrl) ? getProxiedImageUrl(logoUrl) : logoUrl;
            })()}
            alt={`${data.companyName} Logo`}
            className="h-20 w-auto max-w-[120px] object-contain"
            onError={e => {
              console.error('🖼️ Company Logo Error:', e);
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'block';
            }}
            onLoad={() => {
              console.log('🖼️ Company Logo erfolgreich geladen für:', data.companyName);
            }}
          />
        ) : (
          <div className="h-20 w-16 p-2 border-2 border-dashed border-gray-300 rounded bg-gray-50 text-center flex flex-col justify-center">
            <div className="text-xs text-gray-500 font-medium">Logo</div>
            <div className="text-xs text-gray-400 mt-1">{data.companyName}</div>
          </div>
        )}
      </div>
      {/* Header mit Firmenangaben und Rechnungsinfo */}
      <div className="flex justify-between items-start mb-8">
        {/* Linke Seite: Firmenangaben */}
        <div className="flex-1">
          <div className="text-base font-bold text-gray-900 mb-1">{data.companyName}</div>
          <div className="text-sm text-gray-700 whitespace-pre-line leading-tight">
            {data.companyAddress}
          </div>

          {data.companyPhone && (
            <div className="text-sm text-gray-700 mt-1">Tel: {data.companyPhone}</div>
          )}
          {data.companyEmail && (
            <div className="text-sm text-gray-700">E-Mail: {data.companyEmail}</div>
          )}
          {data.companyWebsite && (
            <div className="text-sm text-gray-700">Web: {data.companyWebsite}</div>
          )}
        </div>

        {/* Rechte Seite: Rechnungsinfo */}
        <div className="text-right">
          <h1 className="text-xl font-bold text-[#14ad9f] mb-3">RECHNUNG</h1>
          <div className="text-sm text-gray-700">
            <div className="mb-1">
              <strong>Rechnungsnr.:</strong> {data.invoiceNumber}
            </div>
            <div className="mb-1">
              <strong>Datum:</strong> {data.issueDate}
            </div>
            <div className="mb-1">
              <strong>Fällig:</strong> {data.dueDate}
            </div>
          </div>
        </div>
      </div>{' '}
      {/* Steuerliche Pflichtangaben (UStG §14) */}
      <div className="border-t border-gray-300 pt-3 mb-4">
        <div className="text-xs text-gray-600 space-y-0.5 leading-tight">
          {data.companyTaxNumber && (
            <div>
              <strong>Steuernummer:</strong> {data.companyTaxNumber}
            </div>
          )}
          {data.companyVatId && (
            <div>
              <strong>USt-IdNr.:</strong> {data.companyVatId}
            </div>
          )}
          <div>
            <strong>Fortlaufende Nummer:</strong>{' '}
            {data.sequentialNumber?.toString().padStart(6, '0')}
          </div>
        </div>
      </div>
      {/* Rechnungsempfänger */}
      <div className="mb-6">
        <div className="text-sm font-semibold text-gray-900 mb-2">Rechnungsempfänger:</div>
        <div className="bg-gray-50 p-3 border border-gray-200">
          <div className="font-semibold text-sm text-gray-900">{data.customerName}</div>
          <div className="text-xs text-gray-700 whitespace-pre-line leading-tight">
            {data.customerAddress}
          </div>
          {data.customerEmail && (
            <div className="text-xs text-gray-700 mt-1">E-Mail: {data.customerEmail}</div>
          )}
        </div>
      </div>
      {/* Rechnungspositionen */}
      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#14ad9f] text-white">
              <th className="border border-gray-300 p-2 text-left">Beschreibung</th>
              <th className="border border-gray-300 p-2 text-center w-16">Menge</th>
              <th className="border border-gray-300 p-2 text-right w-20">Einzelpreis</th>
              <th className="border border-gray-300 p-2 text-center w-16">MwSt.</th>
              <th className="border border-gray-300 p-2 text-right w-24">Gesamtpreis</th>
            </tr>
          </thead>
          <tbody>
            {data.items?.map((item, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="border border-gray-300 p-2">{item.description}</td>
                <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                <td className="border border-gray-300 p-2 text-right">
                  {item.unitPrice?.toFixed(2)} €
                </td>
                <td className="border border-gray-300 p-2 text-center">
                  {data.isSmallBusiness
                    ? '-'
                    : data.tax === 0 && !data.isSmallBusiness
                      ? '0%'
                      : data.taxNote === 'reverse-charge'
                        ? '0%'
                        : `${item.taxRate || 19}%`}
                </td>
                <td className="border border-gray-300 p-2 text-right font-semibold">
                  {item.total?.toFixed(2)} €
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Summenbereich mit deutscher Steuerlogik */}
      <div className="flex justify-between mb-8">
        {/* Bankdaten und Steuerhinweise links */}
        <div className="w-96 pr-8">
          {/* Bankverbindung */}
          {data.bankDetails && (
            <div className="mb-4">
              <div className="text-sm font-semibold text-gray-900 mb-2">Bankverbindung:</div>
              <div className="text-gray-700 text-sm">
                {data.bankDetails.iban && (
                  <div>
                    <strong>IBAN:</strong> {data.bankDetails.iban}
                  </div>
                )}
                {data.bankDetails.bic && (
                  <div>
                    <strong>BIC:</strong> {data.bankDetails.bic}
                  </div>
                )}
                {data.bankDetails.accountHolder && (
                  <div>
                    <strong>Kontoinhaber:</strong> {data.bankDetails.accountHolder}
                  </div>
                )}
                {data.bankDetails.bankName && (
                  <div>
                    <strong>Bank:</strong> {data.bankDetails.bankName}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Steuerhinweise */}
          {(data.isSmallBusiness ||
            data.taxNote === 'kleinunternehmer' ||
            data.taxNote === 'reverse-charge' ||
            (data.vatRate === 0 && data.tax === 0) ||
            (data.tax === 0 && !data.isSmallBusiness)) && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
              <div className="text-xs text-yellow-800">
                <div className="font-semibold mb-1">Steuerhinweis:</div>
                <div className="leading-relaxed">
                  {data.isSmallBusiness || data.taxNote === 'kleinunternehmer'
                    ? 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.'
                    : data.taxNote === 'reverse-charge'
                      ? 'Nach dem Reverse-Charge-Prinzip §13b Abs.2 UStG schulden Sie als Leistungsempfänger die Umsatzsteuer als Unternehmer.'
                      : data.vatRate === 0 && data.tax === 0
                        ? 'Nach dem Reverse-Charge-Prinzip §13b Abs.2 UStG schulden Sie als Leistungsempfänger die Umsatzsteuer als Unternehmer.'
                        : data.tax === 0 && !data.isSmallBusiness
                          ? 'Nach dem Reverse-Charge-Prinzip §13b Abs.2 UStG schulden Sie als Leistungsempfänger die Umsatzsteuer als Unternehmer.'
                          : 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summen rechts */}
        <div className="w-64">
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span>Nettobetrag:</span>
            <span className="font-semibold">{data.amount?.toFixed(2)} €</span>
          </div>

          {data.isSmallBusiness ? (
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-xs">Kleinunternehmerregelung §19 UStG:</span>
              <span className="text-xs">keine MwSt.</span>
            </div>
          ) : (
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span>Mehrwertsteuer:</span>
              <span className="font-semibold">{data.tax?.toFixed(2)} €</span>
            </div>
          )}

          <div className="flex justify-between py-3 border-b-2 border-[#14ad9f] bg-gray-50 px-2">
            <span className="font-bold text-lg">Gesamtbetrag:</span>
            <span className="font-bold text-lg text-[#14ad9f]">{data.total?.toFixed(2)} €</span>
          </div>
        </div>
      </div>
      {/* Zahlungsbedingungen */}
      {data.paymentTerms && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-900 mb-1">Zahlungsbedingungen:</div>
          <div className="text-gray-700 text-xs">{data.paymentTerms}</div>

          {/* Skonto-Bedingungen anzeigen */}
          {data.skontoEnabled && data.skontoText && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
              <div className="text-xs font-semibold text-green-800 mb-1">Skonto-Möglichkeit:</div>
              <div className="text-green-700 text-xs">{data.skontoText}</div>
            </div>
          )}
        </div>
      )}
      {/* Bemerkungen */}
      {data.notes && (
        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-900 mb-2">Bemerkungen:</div>
          <div className="text-gray-700 text-sm whitespace-pre-line">{data.notes}</div>
        </div>
      )}
      {/* Spacer um Footer nach unten zu drücken */}
      <div className="flex-grow"></div>
      {/* Footer mit Rechtlichen Hinweisen */}
      <div className="mt-8 pt-4 border-t border-gray-300">
        <div className="text-xs text-gray-500 text-center">
          Diese Rechnung entspricht den Anforderungen des UStG §14 und ist GoBD-konform archiviert.
        </div>

        {/* Zusätzliche rechtliche Hinweise */}
        <div className="text-xs text-gray-500 text-center mt-2 space-y-1">
          <div>
            Geschäftsführer: {data.companyName} |{' '}
            {data.districtCourt && `Amtsgericht: ${data.districtCourt}`}
          </div>
          {data.companyRegister && <div>Handelsregister: {data.companyRegister}</div>}
          <div className="mt-1 text-[#14ad9f] font-semibold">
            Erstellt mit Taskilo.de - Professionelle Rechnungsstellung
          </div>
        </div>
      </div>
    </div>
  );
};
