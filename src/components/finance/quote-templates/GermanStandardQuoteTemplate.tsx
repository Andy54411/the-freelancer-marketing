import React from 'react';
import DOMPurify from 'dompurify';
import { getProxiedImageUrl, isFirebaseStorageUrl } from '@/utils/imageProxy';
import type { QuoteTemplateData } from './GermanMultiPageQuoteTemplate';
// Re-export des Typs, damit Konsumenten nicht direkt die MultiPage-Datei importieren müssen
export type { QuoteTemplateData } from './GermanMultiPageQuoteTemplate';

interface TemplateProps {
  data: QuoteTemplateData;
  preview?: boolean;
}

/**
 * Deutsche Standard-Angebotsvorlage
 *
 * - A4-Format, an Rechnungs-Standardvorlage angelehnt
 * - Schaltet bei >15 Positionen automatisch auf die mehrseitige Vorlage um
 */
export const GermanStandardQuoteTemplate: React.FC<TemplateProps> = ({ data, preview = false }) => {
  // Hinweis: Kein automatischer Wechsel mehr zur mehrseitigen Vorlage – es wird immer die Standardvorlage verwendet.

  const formatCurrency = (amount: number) => {
    const code = data.currency || 'EUR';
    try {
      return new Intl.NumberFormat('de-DE', { style: 'currency', currency: code }).format(
        Number.isFinite(amount) ? amount : 0
      );
    } catch {
      const val = Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
      return `${val} ${code}`;
    }
  };

  // Platzhalter ersetzen: unterstützt mehrere Tokens und Vorkommen
  const replacePlaceholders = (input: string): string => {
    const map: Record<string, string> = {
      KONTAKTPERSON: data.contactPersonName || '',
      FIRMENNAME: data.companyName || '',
      KUNDENNAME: data.customerName || '',
      ANGEBOTSNUMMER: data.quoteNumber || '',
      DATUM: data.date || '',
      GUELTIG_BIS: data.validUntil || '',
      WAEHRUNG: data.currency || '',
      SUMME: formatCurrency(data.total || 0),
    };
    return (input || '').replace(/\[%([A-Z_]+)%\]/g, (_, key: string) => map[key] ?? '');
  };

  return (
    <div
      data-quote-template
      className="w-full max-w-full min-h-[842px] bg-white p-8 font-sans text-sm leading-normal flex flex-col mx-auto relative"
    >
      {/* Hinweis: Farben werden im Print über den Wrapper erzwungen (-webkit-print-color-adjust: exact). */}
      {/* Logo */}
      <div className="flex justify-end mb-6">
        {data.companyLogo || data.profilePictureURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={((): string => {
              const logoUrl = data.companyLogo || data.profilePictureURL || '';
              return isFirebaseStorageUrl(logoUrl) ? getProxiedImageUrl(logoUrl) : logoUrl;
            })()}
            alt={`${data.companyName} Logo`}
            className="h-20 w-auto max-w-[120px] object-contain"
            onError={e => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="h-20 w-16 p-2 border-2 border-dashed border-gray-300 rounded bg-gray-50 text-center flex flex-col justify-center">
            <div className="text-xs text-gray-500 font-medium">Logo</div>
            <div className="text-xs text-gray-400 mt-1">{data.companyName}</div>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        {/* Firma */}
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
          {data.contactPersonName && (
            <div className="text-sm text-gray-700 mt-1">
              Ansprechpartner: {data.contactPersonName}
            </div>
          )}
        </div>

        {/* Angebotsinfo */}
        <div className="text-right">
          <h1 className="text-xl font-bold text-[#14ad9f] mb-3">ANGEBOT</h1>
          <div className="text-sm text-gray-700">
            <div className="mb-1">
              <strong>Angebotsnr.:</strong> {data.quoteNumber}
            </div>
            <div className="mb-1">
              <strong>Datum:</strong> {data.date}
            </div>
            <div className="mb-1">
              <strong>Gültig bis:</strong> {data.validUntil}
            </div>
            {data.title && (
              <div className="mb-1">
                <strong>Titel:</strong> {data.title}
              </div>
            )}
            {data.reference && (
              <div className="mb-1">
                <strong>Referenz:</strong> {data.reference}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Kunde */}
      <div className="mb-6">
        <div className="text-sm font-semibold text-gray-900 mb-2">Kunde:</div>
        <div className="bg-gray-50 p-3 border border-gray-200">
          <div className="font-semibold text-sm text-gray-900">{data.customerName}</div>
          {data.customerAddress && (
            <div className="text-xs text-gray-700 whitespace-pre-line leading-tight">
              {data.customerAddress}
            </div>
          )}
          {data.customerEmail && (
            <div className="text-xs text-gray-700 mt-1">E-Mail: {data.customerEmail}</div>
          )}
        </div>
      </div>

      {/* Kopf-Text (Einleitung) */}
      {data.headTextHtml && (
        <div className="mb-6 text-sm text-gray-800">
          {(() => {
            const safe = DOMPurify.sanitize(data.headTextHtml || '', {
              USE_PROFILES: { html: true },
            });
            return (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: safe }}
              />
            );
          })()}
        </div>
      )}

      {/* Positionen */}
      <div className="mb-8">
        <table className="quote-table w-full border-collapse">
          <thead>
            <tr className="bg-[#14ad9f] text-white">
              <th className="border border-gray-300 p-3 text-left font-semibold">Beschreibung</th>
              <th className="border border-gray-300 p-3 text-center w-16 font-semibold">Menge</th>
              <th className="border border-gray-300 p-3 text-right w-24 font-semibold">
                Einzelpreis
              </th>
              <th className="border border-gray-300 p-3 text-right w-28 font-semibold">
                Gesamtpreis
              </th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => {
              const isDiscount = (item as any).category === 'discount';
              const sign = isDiscount ? -1 : 1;
              const unit = (item.unitPrice || 0) * sign;
              const total = (item.total || 0) * sign;
              return (
                <tr key={item.id ?? index} className="border-b border-gray-200">
                  <td className="border border-gray-300 p-2">{item.description}</td>
                  <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                  <td
                    className={`border border-gray-300 p-2 text-right ${isDiscount ? 'text-red-600' : ''}`}
                  >
                    {formatCurrency(unit)}
                  </td>
                  <td
                    className={`border border-gray-300 p-2 text-right font-semibold ${isDiscount ? 'text-red-600' : ''}`}
                  >
                    {formatCurrency(total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summenbereich */}
      <div className="flex justify-between mb-8">
        {/* Hinweise links */}
        <div className="w-96 pr-8">
          {(data as any).taxRuleLabel && (
            <div className="text-xs text-gray-600 mb-2">
              USt.-Regelung: {(data as any).taxRuleLabel}
            </div>
          )}
          <div className="text-xs text-gray-600">
            Dieses Angebot ist gültig bis {data.validUntil}.
          </div>
          {data.notes && (
            <div className="text-xs text-gray-600 whitespace-pre-line mt-2">{data.notes}</div>
          )}
        </div>

        {/* Summen rechts */}
        <div className="w-64">
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span>Nettobetrag:</span>
            <span className="font-semibold">{formatCurrency(data.subtotal)}</span>
          </div>
          {!data.isSmallBusiness && data.tax > 0 && (
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span>MwSt.{data.vatRate ? ` (${data.vatRate}%)` : ''}:</span>
              <span className="font-semibold">{formatCurrency(data.tax)}</span>
            </div>
          )}
          <div className="flex justify-between py-3 border-b-2 border-[#14ad9f] bg-gray-50 px-2">
            <span className="font-bold text-lg">Gesamtbetrag:</span>
            <span className="font-bold text-lg text-[#14ad9f]">{formatCurrency(data.total)}</span>
          </div>
        </div>
      </div>

      {/* Bemerkungen: optional weiterhin rendern, falls separate Darstellung gewünscht */}
      {data.notes && (
        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-900 mb-2">Bemerkungen:</div>
          <div className="text-gray-700 text-sm whitespace-pre-line">{data.notes}</div>
        </div>
      )}

      {/* Fuß-Text (Rich-Text, sicher gerendert) */}
      {data.footerText && (
        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-900 mb-2">&nbsp;</div>
          {(() => {
            const substituted = replacePlaceholders(data.footerText || '');
            const looksLikeHtml = /<([a-z][\w-]*)(?:\s[^>]*)?>/i.test(substituted);
            const safe = looksLikeHtml
              ? DOMPurify.sanitize(substituted, { USE_PROFILES: { html: true } })
              : DOMPurify.sanitize(substituted).replaceAll('\n', '<br />');
            return (
              <div className="text-gray-700 text-sm" dangerouslySetInnerHTML={{ __html: safe }} />
            );
          })()}
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300">
        <div className="text-xs text-gray-500 text-center">
          Dieses Angebot wurde automatisch erstellt.
        </div>
        <div className="text-xs text-gray-500 text-center mt-2">
          {data.companyVatId && <>USt-IdNr.: {data.companyVatId} · </>}
          {data.companyTaxNumber && <>Steuernr.: {data.companyTaxNumber}</>}
        </div>
      </div>
    </div>
  );
};

export default GermanStandardQuoteTemplate;
