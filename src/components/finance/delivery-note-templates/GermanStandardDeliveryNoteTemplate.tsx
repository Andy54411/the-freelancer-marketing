import React from 'react';
import { DeliveryNoteData } from './types';
import { getProxiedImageUrl, isFirebaseStorageUrl } from '@/utils/imageProxy';

interface TemplateProps {
  data: DeliveryNoteData;
  preview?: boolean;
}

/**
 * Deutsche Standard-Lieferschein-Vorlage
 *
 * Features:
 * - Basiert auf GermanStandardTemplate (Rechnungen)
 * - Lieferschein-spezifische Anpassungen
 * - Optional mit Preisanzeige
 * - A4-Format (595px × 842px)
 * - Automatische Mehrseitigkeit bei vielen Positionen
 */
export const GermanStandardDeliveryNoteTemplate: React.FC<TemplateProps> = ({ data, preview = false }) => {
  // Automatische Erkennung: Ab 15 Positionen mehrseitig
  const maxItemsPerPage = 15;
  const totalItems = data.items?.length || 0;
  const shouldUseMultiPage = totalItems > maxItemsPerPage;

  // Vorerst immer Standard-Template verwenden
  // TODO: Mehrseitige Unterstützung später hinzufügen
  if (shouldUseMultiPage) {
    console.warn('Mehrseitige Lieferscheine werden noch nicht unterstützt. Verwende Standard-Template.');
  }

  return (
    <div
      data-delivery-note-template
      className="w-full max-w-full min-h-[842px] bg-white p-8 font-sans text-sm leading-normal flex flex-col mx-auto relative"
    >
      {/* Logo ganz oben */}
      <div className="flex justify-end mb-6">
        {data.companyLogo || data.profilePictureURL ? (
          <img
            src={(() => {
              const logoUrl = data.companyLogo || data.profilePictureURL;
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

      {/* Header mit Firmenangaben und Lieferschein-Info */}
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

        {/* Rechte Seite: Lieferschein-Info */}
        <div className="text-right">
          <h1 className="text-xl font-bold text-[#14ad9f] mb-3">LIEFERSCHEIN</h1>
          <div className="text-sm text-gray-700">
            <div className="mb-1">
              <strong>Lieferschein-Nr.:</strong> {data.deliveryNoteNumber}
            </div>
            <div className="mb-1">
              <strong>Datum:</strong> {data.date}
            </div>
            <div className="mb-1">
              <strong>Lieferdatum:</strong> {data.deliveryDate}
            </div>
            {data.orderNumber && (
              <div className="mb-1">
                <strong>Bestellung:</strong> {data.orderNumber}
              </div>
            )}
            {data.customerOrderNumber && (
              <div className="mb-1">
                <strong>Ihre Bestellung:</strong> {data.customerOrderNumber}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lieferadresse */}
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

      {/* Artikeltabelle */}
      <div className="flex-1 mb-6">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-[#14ad9f] text-white">
              <th className="border border-gray-300 p-3 text-left font-semibold">Pos.</th>
              <th className="border border-gray-300 p-3 text-left font-semibold">Beschreibung</th>
              <th className="border border-gray-300 p-3 text-center font-semibold">Menge</th>
              <th className="border border-gray-300 p-3 text-center font-semibold">Einheit</th>
              {data.showPrices && (
                <>
                  <th className="border border-gray-300 p-3 text-right font-semibold">Einzelpreis</th>
                  <th className="border border-gray-300 p-3 text-right font-semibold">Gesamt</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data.items?.map((item, index) => (
              <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-gray-300 p-3 text-center font-medium">
                  {index + 1}
                </td>
                <td className="border border-gray-300 p-3">
                  <div className="font-medium text-gray-900">{item.description}</div>
                  {item.notes && (
                    <div className="text-xs text-gray-600 mt-1">{item.notes}</div>
                  )}
                  {item.serialNumbers && item.serialNumbers.length > 0 && (
                    <div className="text-xs text-gray-600 mt-1">
                      SN: {item.serialNumbers.join(', ')}
                    </div>
                  )}
                </td>
                <td className="border border-gray-300 p-3 text-center">
                  {item.quantity}
                </td>
                <td className="border border-gray-300 p-3 text-center">
                  {item.unit}
                </td>
                {data.showPrices && (
                  <>
                    <td className="border border-gray-300 p-3 text-right">
                      {item.unitPrice ? `${item.unitPrice.toFixed(2)} €` : '-'}
                    </td>
                    <td className="border border-gray-300 p-3 text-right font-medium">
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
            ))}
          </tbody>
        </table>
      </div>

      {/* Summen (nur wenn Preise angezeigt werden) */}
      {data.showPrices && data.total && (
        <div className="flex justify-end mb-6">
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
            
            {data.isSmallBusiness && (
              <div className="text-xs text-gray-600 mt-2 text-right">
                Kleinunternehmerregelung nach §19 UStG - Keine Umsatzsteuer ausgewiesen
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bemerkungen */}
      {(data.notes || data.specialInstructions || data.deliveryTerms) && (
        <div className="mb-6 space-y-3">
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
          
          {data.deliveryTerms && (
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-1">Lieferbedingungen:</div>
              <div className="text-sm text-gray-600 leading-relaxed">{data.deliveryTerms}</div>
            </div>
          )}
        </div>
      )}

      {/* Versandinformationen */}
      {(data.shippingMethod || data.trackingNumber) && (
        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-700 mb-2">Versandinformationen:</div>
          <div className="bg-gray-50 p-3 rounded border text-sm text-gray-700">
            {data.shippingMethod && (
              <div>Versandart: {data.shippingMethod}</div>
            )}
            {data.trackingNumber && (
              <div>Sendungsnummer: {data.trackingNumber}</div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-300 pt-4 mt-auto">
        <div className="flex justify-between items-start text-xs text-gray-600">
          <div>
            <div className="font-semibold text-gray-700 mb-1">Vielen Dank für Ihr Vertrauen!</div>
            <div>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</div>
          </div>
          
          <div className="text-right">
            {data.companyVatId && (
              <div>USt-IdNr.: {data.companyVatId}</div>
            )}
            {data.companyTaxNumber && (
              <div>Steuernr.: {data.companyTaxNumber}</div>
            )}
            {data.companyRegister && data.districtCourt && (
              <div>{data.companyRegister}, {data.districtCourt}</div>
            )}
          </div>
        </div>
        
        <div className="text-center mt-4 text-xs text-gray-500 italic">
          Dieser Lieferschein wurde automatisch erstellt und ist ohne Unterschrift gültig.
        </div>
      </div>
    </div>
  );
};
