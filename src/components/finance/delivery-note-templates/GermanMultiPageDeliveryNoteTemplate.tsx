import React from 'react';
import { DeliveryNoteData } from './types';
import { getProxiedImageUrl, isFirebaseStorageUrl } from '@/utils/imageProxy';

interface TemplateProps {
  data: DeliveryNoteData;
  preview?: boolean;
}

/**
 * Deutsche mehrseitige Lieferschein-Vorlage
 * Für Lieferscheine mit vielen Positionen
 */
export const GermanMultiPageDeliveryNoteTemplate: React.FC<TemplateProps> = ({ data, preview = false }) => {
  const itemsPerPage = 12;
  const totalPages = Math.ceil((data.items?.length || 0) / itemsPerPage);

  const renderHeader = (pageNumber: number) => (
    <div className="flex justify-between items-start mb-6">
      {/* Logo */}
      <div className="flex items-start">
        {data.companyLogo || data.profilePictureURL ? (
          <img
            src={(() => {
              const logoUrl = data.companyLogo || data.profilePictureURL;
              if (!logoUrl) return '';
              return isFirebaseStorageUrl(logoUrl) ? getProxiedImageUrl(logoUrl) : logoUrl;
            })()}
            alt={`${data.companyName} Logo`}
            className="h-16 w-auto max-w-[100px] object-contain mr-4"
          />
        ) : (
          <div className="h-16 w-16 p-2 border-2 border-dashed border-gray-300 rounded bg-gray-50 text-center flex flex-col justify-center mr-4">
            <div className="text-xs text-gray-500 font-medium">Logo</div>
          </div>
        )}
        
        {/* Firmeninformationen */}
        <div>
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
        </div>
      </div>

      {/* Lieferschein-Info */}
      <div className="text-right">
        <h1 className="text-xl font-bold text-[#14ad9f] mb-2">LIEFERSCHEIN</h1>
        <div className="text-sm text-gray-700">
          <div>Nr.: {data.deliveryNoteNumber}</div>
          <div>Datum: {data.date}</div>
          <div>Lieferdatum: {data.deliveryDate}</div>
          {pageNumber > 1 && (
            <div className="mt-2 text-xs text-gray-500">
              Seite {pageNumber} von {totalPages}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderCustomerInfo = () => (
    <div className="mb-6">
      <div className="text-sm text-gray-600 mb-2">Lieferadresse:</div>
      <div className="bg-gray-50 p-4 rounded border">
        <div className="font-semibold text-gray-900">{data.customerName}</div>
        <div className="text-sm text-gray-700 mt-1 whitespace-pre-line leading-tight">
          {data.customerAddress}
        </div>
        {data.customerEmail && (
          <div className="text-sm text-[#14ad9f] mt-1">{data.customerEmail}</div>
        )}
      </div>
    </div>
  );

  const renderTableHeader = () => (
    <thead>
      <tr className="bg-[#14ad9f] text-white">
        <th className="border border-gray-300 p-2 text-left font-semibold">Pos.</th>
        <th className="border border-gray-300 p-2 text-left font-semibold">Beschreibung</th>
        <th className="border border-gray-300 p-2 text-center font-semibold">Menge</th>
        <th className="border border-gray-300 p-2 text-center font-semibold">Einheit</th>
        {data.showPrices && (
          <>
            <th className="border border-gray-300 p-2 text-right font-semibold">Einzelpreis</th>
            <th className="border border-gray-300 p-2 text-right font-semibold">Gesamt</th>
          </>
        )}
      </tr>
    </thead>
  );

  const renderFooter = () => (
    <div className="border-t border-gray-300 pt-3 mt-auto text-xs text-gray-600 text-center">
      <div className="flex justify-between">
        <div>{data.companyName}</div>
        <div>{data.companyEmail}</div>
        <div>{data.companyPhone}</div>
      </div>
      <div className="mt-2 italic">
        Dieser Lieferschein wurde automatisch erstellt und ist ohne Unterschrift gültig.
      </div>
    </div>
  );

  const pages: React.ReactElement[] = [];
  
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const startIndex = (pageNum - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, data.items?.length || 0);
    const pageItems = data.items?.slice(startIndex, endIndex) || [];
    const isFirstPage = pageNum === 1;
    const isLastPage = pageNum === totalPages;

    pages.push(
      <div
        key={pageNum}
        className={`w-full max-w-full min-h-[842px] bg-white p-6 font-sans text-sm leading-normal flex flex-col mx-auto relative ${
          pageNum > 1 ? 'page-break-before mt-8' : ''
        }`}
        style={{ pageBreakBefore: pageNum > 1 ? 'always' : 'auto' }}
      >
        {renderHeader(pageNum)}
        
        {/* Kundeninfo nur auf der ersten Seite */}
        {isFirstPage && renderCustomerInfo()}
        
        {/* Artikeltabelle */}
        <div className="flex-1 mb-4">
          <table className="w-full border-collapse border border-gray-300">
            {renderTableHeader()}
            <tbody>
              {pageItems.map((item, index) => {
                const globalIndex = startIndex + index;
                return (
                  <tr key={item.id} className={globalIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 p-2 text-center font-medium">
                      {globalIndex + 1}
                    </td>
                    <td className="border border-gray-300 p-2">
                      <div className="font-medium text-gray-900">{item.description}</div>
                      {item.notes && (
                        <div className="text-xs text-gray-600 mt-1">{item.notes}</div>
                      )}
                    </td>
                    <td className="border border-gray-300 p-2 text-center">
                      {item.quantity}
                    </td>
                    <td className="border border-gray-300 p-2 text-center">
                      {item.unit}
                    </td>
                    {data.showPrices && (
                      <>
                        <td className="border border-gray-300 p-2 text-right">
                          {item.unitPrice ? `${item.unitPrice.toFixed(2)} €` : '-'}
                        </td>
                        <td className="border border-gray-300 p-2 text-right font-medium">
                          {item.total 
                            ? `${item.total.toFixed(2)} €`
                            : item.unitPrice 
                              ? `${(item.quantity * item.unitPrice).toFixed(2)} €`
                              : '-'
                          }
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summen und zusätzliche Infos nur auf der letzten Seite */}
        {isLastPage && (
          <>
            {/* Summen */}
            {data.showPrices && data.total && (
              <div className="flex justify-end mb-4">
                <div className="w-80">
                  <div className="border border-gray-300 rounded">
                    {data.subtotal && (
                      <div className="flex justify-between p-3 border-b border-gray-200">
                        <span className="text-gray-700">Zwischensumme:</span>
                        <span className="font-medium">{data.subtotal.toFixed(2)} €</span>
                      </div>
                    )}
                    
                    {data.tax && data.vatRate && (
                      <div className="flex justify-between p-3 border-b border-gray-200">
                        <span className="text-gray-700">MwSt. ({data.vatRate}%):</span>
                        <span className="font-medium">{data.tax.toFixed(2)} €</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between p-3 bg-[#14ad9f] text-white rounded-b">
                      <span className="font-semibold">Gesamtwert:</span>
                      <span className="font-bold text-lg">{data.total.toFixed(2)} €</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bemerkungen */}
            {(data.notes || data.specialInstructions) && (
              <div className="mb-4 space-y-2">
                {data.notes && (
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-1">Bemerkungen:</div>
                    <div className="text-sm text-gray-600 leading-relaxed">{data.notes}</div>
                  </div>
                )}
                
                {data.specialInstructions && (
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-1">Besondere Anweisungen:</div>
                    <div className="text-sm text-gray-600 leading-relaxed">{data.specialInstructions}</div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {renderFooter()}
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          .page-break-before {
            page-break-before: always;
          }
        }
      `}</style>
      <div data-delivery-note-template className="delivery-note-multipage">
        {pages}
      </div>
    </>
  );
};
