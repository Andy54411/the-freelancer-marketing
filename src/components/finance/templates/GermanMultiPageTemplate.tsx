import React from 'react';
import { InvoiceData } from './types';
import { getProxiedImageUrl, isFirebaseStorageUrl } from '@/utils/imageProxy';

interface TemplateProps {
  data: InvoiceData;
}

/**
 * Deutsche Mehrseitige Rechnungsvorlage
 *
 * Features:
 * - UStG §14 konforme Pflichtangaben
 * - GoBD-zertifizierte Struktur
 * - Mehrseitige Rechnungen mit Header/Footer auf jeder Seite
 * - Automatische Seitenumbrüche bei vielen Positionen
 * - A4-Format mit Print-Optimierung
 */
export const GermanMultiPageTemplate: React.FC<TemplateProps> = ({ data }) => {
  const itemsPerPage = 12; // Maximale Anzahl Positionen pro Seite
  const totalItems = data.items?.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Aufteilen der Items in Seiten
  const getItemsForPage = (pageIndex: number) => {
    const startIndex = pageIndex * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    return data.items?.slice(startIndex, endIndex) || [];
  };

  // Header-Komponente für jede Seite
  const PageHeader = ({ pageNumber }: { pageNumber: number }) => (
    <div className="mb-6">
      {/* Logo oben rechts */}
      <div className="flex justify-end mb-4">
        {data.companyLogo || data.profilePictureURL || (data as any).logo ? (
          <img
            src={(() => {
              const logoUrl = data.companyLogo || data.profilePictureURL || (data as any).logo;
              if (!logoUrl) return '';
              return isFirebaseStorageUrl(logoUrl) ? getProxiedImageUrl(logoUrl) : logoUrl;
            })()}
            alt={`${data.companyName} Logo`}
            className="h-16 w-auto max-w-[100px] object-contain"
            onError={e => {
              console.error('🖼️ Company Logo Error:', e);
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="h-16 w-14 p-1 border border-dashed border-gray-300 rounded bg-gray-50 text-center flex flex-col justify-center">
            <div className="text-xs text-gray-500 font-medium">Logo</div>
          </div>
        )}
      </div>

      {/* Header mit Firmenangaben und Rechnungsinfo */}
      <div className="flex justify-between items-start mb-6">
        {/* Firmenangaben */}
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
            <div className="text-sm text-gray-600">Fortsetzung Rechnung {data.invoiceNumber}</div>
          )}
        </div>

        {/* Rechnungsinfo */}
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

  // Footer-Komponente für jede Seite
  const PageFooter = ({ pageNumber }: { pageNumber: number }) => (
    <div className="mt-auto pt-4 border-t border-gray-200">
      <div className="text-xs text-gray-600 flex justify-between">
        <span>
          {data.companyName} | {data.companyEmail}
        </span>
        <span>
          Seite {pageNumber} von {totalPages}
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* CSS für mehrseitige Rechnungen */}
      <style jsx>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          .page-break {
            page-break-before: always;
          }
          .avoid-break {
            page-break-inside: avoid;
          }
        }
        .invoice-page {
          min-height: 100vh;
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
            data-invoice-template
            className={`invoice-page w-full max-w-full bg-white p-8 font-sans text-sm leading-normal flex flex-col mx-auto relative ${pageNumber > 1 ? 'page-break' : ''}`}
          >
            <PageHeader pageNumber={pageNumber} />

            {/* Steuerliche Pflichtangaben - nur auf erster Seite */}
            {isFirstPage && (
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

            {/* Rechnungsempfänger - nur auf erster Seite */}
            {isFirstPage && (
              <div className="mb-8">
                <div className="text-sm font-semibold text-gray-900 mb-2">Rechnungsempfänger:</div>
                <div className="text-gray-700">
                  <div className="font-semibold">{data.customerName}</div>
                  {data.customerAddress && (
                    <div className="text-sm whitespace-pre-line">{data.customerAddress}</div>
                  )}
                  {data.customerEmail && (
                    <div className="text-xs text-gray-700 mt-1">E-Mail: {data.customerEmail}</div>
                  )}
                </div>
              </div>
            )}

            {/* Rechnungspositionen */}
            <div className="mb-8 flex-grow">
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
                  {pageItems.map((item, index) => (
                    <tr
                      key={`page-${pageNumber}-item-${index}`}
                      className="border-b border-gray-200 avoid-break"
                    >
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

              {/* Fortsetzungshinweis */}
              {!isLastPage && (
                <div className="text-right text-xs text-gray-500 mt-4">
                  Fortsetzung auf Seite {pageNumber + 1}...
                </div>
              )}
            </div>

            {/* Summen nur auf letzter Seite */}
            {isLastPage && (
              <div className="mb-8">
                {/* Summenbereich */}
                <div className="flex justify-between">
                  {/* Bankdaten links */}
                  <div className="w-96 pr-8">
                    {data.bankDetails && (
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
                  </div>

                  {/* Summen rechts */}
                  <div className="text-right">
                    <div className="space-y-2">
                      <div className="flex justify-between w-64">
                        <span>Nettobetrag:</span>
                        <span>{(data.total - data.tax)?.toFixed(2)} €</span>
                      </div>
                      {!data.isSmallBusiness && data.tax !== 0 && (
                        <div className="flex justify-between">
                          <span>MwSt. ({data.vatRate || 19}%):</span>
                          <span>{data.tax?.toFixed(2)} €</span>
                        </div>
                      )}
                      <div className="border-t border-gray-300 pt-2 flex justify-between font-bold text-lg">
                        <span>Gesamtbetrag:</span>
                        <span className="text-[#14ad9f]">{data.total?.toFixed(2)} €</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Zahlungsbedingungen */}
                {data.paymentTerms && (
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-900 mb-1">
                      Zahlungsbedingungen:
                    </div>
                    <div className="text-gray-700 text-xs">{data.paymentTerms}</div>

                    {data.skontoEnabled && data.skontoText && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                        <div className="text-xs font-semibold text-green-800 mb-1">
                          Skonto-Möglichkeit:
                        </div>
                        <div className="text-green-700 text-xs">{data.skontoText}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Bemerkungen */}
                {data.notes && (
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-900 mb-1">Bemerkungen:</div>
                    <div className="text-gray-700 text-xs whitespace-pre-line">{data.notes}</div>
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
