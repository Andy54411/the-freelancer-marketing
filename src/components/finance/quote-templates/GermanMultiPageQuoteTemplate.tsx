import React from 'react';
import DOMPurify from 'dompurify';
import { getProxiedImageUrl, isFirebaseStorageUrl } from '@/utils/imageProxy';

export interface QuoteTemplateItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  taxRate?: number;
  category?: string; // z. B. 'discount'
}

export interface QuoteTemplateData {
  // Kopf
  quoteNumber: string;
  date: string; // dd.mm.yyyy
  validUntil: string; // dd.mm.yyyy
  title?: string; // Angebotstitel
  reference?: string; // Referenz / Bestellnummer
  currency?: string; // ISO-4217

  // Steuerregel
  taxRule?:
    | 'DE_TAXABLE'
    | 'DE_EXEMPT_4_USTG'
    | 'DE_REVERSE_13B'
    | 'EU_REVERSE_18B'
    | 'EU_INTRACOMMUNITY_SUPPLY'
    | 'EU_OSS'
    | 'NON_EU_EXPORT'
    | 'NON_EU_OUT_OF_SCOPE';
  taxRuleLabel?: string;

  // Kunde
  customerName: string;
  customerAddress: string; // multiline
  customerEmail?: string;

  // Firma
  companyName: string;
  companyAddress: string; // multiline
  companyEmail?: string;
  companyPhone?: string;
  companyWebsite?: string;
  companyLogo?: string;
  profilePictureURL?: string;
  companyVatId?: string;
  companyTaxNumber?: string;

  // Positionen / Summen
  items: QuoteTemplateItem[];
  subtotal: number;
  tax: number;
  total: number;
  vatRate?: number; // z. B. 19
  isSmallBusiness?: boolean;

  // Bank
  bankDetails?: {
    iban?: string;
    bic?: string;
    bankName?: string;
    accountHolder?: string;
  };

  // Sonstiges
  notes?: string;
  footerText?: string;
  contactPersonName?: string;
  headTextHtml?: string; // Einleitung / Kopf-Text (sanitisiertes HTML)
}

interface TemplateProps {
  data: QuoteTemplateData;
}

/**
 * Deutsche mehrseitige Angebotsvorlage (A4, print-optimiert)
 * Stilistisch an die Rechnungsvorlage angelehnt, aber mit Angebots-spezifischen Labels.
 */
export const GermanMultiPageQuoteTemplate: React.FC<TemplateProps> = ({ data }) => {
  const itemsPerPage = 12;
  const totalItems = data.items?.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

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

  const getItemsForPage = (pageIndex: number) => {
    const start = pageIndex * itemsPerPage;
    const end = Math.min(start + itemsPerPage, totalItems);
    return data.items?.slice(start, end) || [];
  };

  const PageHeader = ({ pageNumber }: { pageNumber: number }) => (
    <div className="mb-6">
      <div className="flex justify-end mb-4">
        {data.companyLogo || data.profilePictureURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={((): string => {
              const logoUrl = data.companyLogo || data.profilePictureURL || '';
              return isFirebaseStorageUrl(logoUrl) ? getProxiedImageUrl(logoUrl) : logoUrl;
            })()}
            alt={`${data.companyName} Logo`}
            className="h-16 w-auto max-w-[100px] object-contain"
            onError={e => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="h-16 w-14 p-1 border border-dashed border-gray-300 rounded bg-gray-50 text-center flex flex-col justify-center">
            <div className="text-xs text-gray-500 font-medium">Logo</div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          <div className="text-base font-bold text-gray-900 mb-1">{data.companyName}</div>
          {pageNumber === 1 && (
            <>
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
            </>
          )}
          {pageNumber > 1 && (
            <div className="text-sm text-gray-600">Fortsetzung Angebot {data.quoteNumber}</div>
          )}
        </div>

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
            {totalPages > 1 && (
              <div className="mb-1 text-xs text-gray-500">
                <strong>Seite:</strong> {pageNumber} von {totalPages}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const PageFooter = ({ pageNumber }: { pageNumber: number }) => (
    <div className="mt-auto pt-4 border-t border-gray-200">
      <div className="text-xs text-gray-600 flex justify-between">
        <span>
          {data.companyName} {data.companyEmail ? `| ${data.companyEmail}` : ''}
        </span>
        <span>
          Seite {pageNumber} von {totalPages}
        </span>
      </div>
    </div>
  );

  return (
    <>
      <style jsx>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          /* Nach jeder Seite (außer der letzten) einen Seitenumbruch erzwingen */
          .page-break {
            break-after: page;
            page-break-after: always;
          }
          /* Tabellenzeilen & wichtige Blöcke nicht mitten auf der Seite umbrechen */
          .avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          /* Farben bleiben erhalten; Hintergrund wird vom Wrapper erzwungen */
        }
        /* Keine feste Mindesthöhe pro Seite im Druck, verhindert leere Seiten */
        .quote-page {
          min-height: auto;
        }
      `}</style>

      {Array.from({ length: totalPages }, (_, pageIndex) => {
        const pageNumber = pageIndex + 1;
        const pageItems = getItemsForPage(pageIndex);
        const isFirstPage = pageNumber === 1;
        const isLastPage = pageNumber === totalPages;

        return (
          <div
            key={pageNumber}
            data-quote-template
            className={`quote-page w-full max-w-full bg-white p-8 font-sans text-sm leading-normal flex flex-col mx-auto relative ${isLastPage ? '' : 'page-break'}`}
          >
            <PageHeader pageNumber={pageNumber} />

            {/* Steuerliche Angaben nur auf der ersten Seite */}
            {isFirstPage && (data.companyVatId || data.companyTaxNumber) && (
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
                </div>
              </div>
            )}

            {/* Kunde nur auf erster Seite */}
            {isFirstPage && (
              <div className="mb-8">
                <div className="text-sm font-semibold text-gray-900 mb-2">Kunde:</div>
                <div className="text-gray-700">
                  <div className="font-semibold">{data.customerName}</div>
                  {data.customerAddress && (
                    <div className="text-sm whitespace-pre-line">{data.customerAddress}</div>
                  )}
                  {data.customerEmail && (
                    <div className="text-xs text-gray-700 mt-1">E-Mail: {data.customerEmail}</div>
                  )}
                </div>
                {/* Kopf-Text nur auf der ersten Seite */}
                {data.headTextHtml && (
                  <div className="mt-4 text-sm text-gray-800">
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
              </div>
            )}

            {/* Positionen */}
            <div className="mb-8 flex-grow">
              <table className="quote-table w-full border-collapse">
                <thead>
                  <tr className="bg-[#14ad9f] text-white">
                    <th className="border border-gray-300 p-2 text-left">Beschreibung</th>
                    <th className="border border-gray-300 p-2 text-center w-16">Menge</th>
                    <th className="border border-gray-300 p-2 text-right w-24">Einzelpreis</th>
                    <th className="border border-gray-300 p-2 text-right w-24">Gesamtpreis</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item, index) => {
                    const sign = item.category === 'discount' ? -1 : 1;
                    const unit = (item.unitPrice || 0) * sign;
                    const total = (item.total || 0) * sign;
                    const isDiscount = sign === -1;
                    return (
                      <tr
                        key={`p-${pageNumber}-i-${index}`}
                        className="border-b border-gray-200 avoid-break"
                      >
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
              {!isLastPage && (
                <div className="text-right text-xs text-gray-500 mt-4">
                  Fortsetzung auf Seite {pageNumber + 1}...
                </div>
              )}
            </div>

            {/* Summen nur auf letzter Seite */}
            {isLastPage && (
              <div className="mb-8">
                <div className="flex justify-between">
                  {/* Bank links */}
                  <div className="w-96 pr-8">
                    {data.bankDetails && (data.bankDetails.iban || data.bankDetails.bankName) && (
                      <div className="mb-4">
                        <div className="text-sm font-semibold text-gray-900 mb-2">
                          Bankverbindung:
                        </div>
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
                          {data.bankDetails.bankName && (
                            <div>
                              <strong>Bank:</strong> {data.bankDetails.bankName}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {data.taxRuleLabel && (
                      <div className="text-xs text-gray-600 mb-2">
                        USt.-Regelung: {data.taxRuleLabel}
                      </div>
                    )}
                    <div className="text-xs text-gray-600">
                      Dieses Angebot ist gültig bis {data.validUntil}.
                    </div>
                  </div>

                  {/* Summen rechts */}
                  <div className="text-right">
                    <div className="space-y-2">
                      <div className="flex justify-between w-64">
                        <span>Nettobetrag:</span>
                        <span>{formatCurrency(data.subtotal)}</span>
                      </div>
                      {!data.isSmallBusiness && data.tax > 0 && (
                        <div className="flex justify-between">
                          <span>MwSt.{data.vatRate ? ` (${data.vatRate}%)` : ''}:</span>
                          <span>{formatCurrency(data.tax)}</span>
                        </div>
                      )}
                      <div className="border-t border-gray-300 pt-2 flex justify-between font-bold text-lg">
                        <span>Gesamtbetrag:</span>
                        <span className="text-[#14ad9f]">{formatCurrency(data.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {(data.notes || data.footerText) && (
                  <div className="mt-4">
                    {data.notes && (
                      <>
                        <div className="text-xs font-semibold text-gray-900 mb-1">Bemerkungen:</div>
                        <div className="text-gray-700 text-xs whitespace-pre-line">
                          {data.notes}
                        </div>
                      </>
                    )}
                    {data.footerText &&
                      (() => {
                        const substituted = data.footerText.replace(
                          '[%KONTAKTPERSON%]',
                          data.contactPersonName || ''
                        );
                        const looksLikeHtml = /<([a-z][\w-]*)(?:\s[^>]*)?>/i.test(substituted);
                        const safe = looksLikeHtml
                          ? DOMPurify.sanitize(substituted, { USE_PROFILES: { html: true } })
                          : DOMPurify.sanitize(substituted).replaceAll('\n', '<br />');
                        return (
                          <div
                            className="text-gray-700 text-xs mt-3"
                            dangerouslySetInnerHTML={{ __html: safe }}
                          />
                        );
                      })()}
                  </div>
                )}
              </div>
            )}

            <PageFooter pageNumber={pageNumber} />
          </div>
        );
      })}
    </>
  );
};

export default GermanMultiPageQuoteTemplate;
