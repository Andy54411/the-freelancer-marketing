import React from 'react';
import type { TemplateProps } from '../types';
import { resolveLogoUrl } from '../utils/logoUtils';

// Hilfsfunktion: robustes Datumsformat
const formatDate = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString('de-DE');
};

export const CorporateClassicDeliveryTemplate: React.FC<TemplateProps> = ({
  data,
  companySettings,
  customizations,
}) => {
  const logoUrl = resolveLogoUrl(customizations, companySettings, data);

  // Zusätzliche Felder aus dem Datenobjekt lesen
  const customerNumber = (data as any).customerNumber as string | undefined;
  const orderNumber = (data as any).orderNumber || (data as any).customerOrderNumber;

  return (
    <div className="max-w-4xl mx-auto bg-white p-10 font-serif text-gray-900">
      {/* Logo ganz oben */}
      {logoUrl && (
        <div className="mb-4">
          <img src={logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
        </div>
      )}

      {/* Firmenadresse in einer Zeile */}
      <div className="text-xs text-gray-700 mb-6">
        {companySettings?.companyName}
        {companySettings?.address && (
          <>
            {' '}
            {companySettings.address.street} | {companySettings.address.zipCode}{' '}
            {companySettings.address.city}
          </>
        )}
      </div>

      {/* Kopfbereich: Empfänger links, Kennzahlen rechts */}
      <div className="grid grid-cols-2 gap-16 mb-8">
        {/* Empfänger */}
        <div className="text-gray-900">
          <div className="font-medium">{data.customerName}</div>
          {data.customerAddress && (
            <div className="text-sm whitespace-pre-line mt-1">
              {typeof data.customerAddress === 'string'
                ? data.customerAddress
                : `${data.customerAddress.street}\n${data.customerAddress.zipCode} ${data.customerAddress.city}${
                    data.customerAddress.country ? '\n' + data.customerAddress.country : ''
                  }`}
            </div>
          )}
        </div>
        {/* Kennzahlen rechts */}
        <div className="text-sm text-gray-800">
          <div className="flex justify-between gap-8">
            <div className="text-gray-600">Liefer-Nr.:</div>
            <div className="font-semibold">{data.documentNumber}</div>
          </div>
          {customerNumber && (
            <div className="flex justify-between gap-8 mt-1">
              <div className="text-gray-600">Kunden-Nr.:</div>
              <div className="font-medium">{customerNumber}</div>
            </div>
          )}
          {orderNumber && (
            <div className="flex justify-between gap-8 mt-1">
              <div className="text-gray-600">Bestell-Nr.:</div>
              <div className="font-medium">{orderNumber}</div>
            </div>
          )}
          <div className="flex justify-between gap-8 mt-1">
            <div className="text-gray-600">Datum:</div>
            <div className="font-medium">{formatDate(data.date)}</div>
          </div>
        </div>
      </div>

      {/* Titel */}
      <div className="flex items-center justify-between mb-6 pb-2 border-b-2 border-gray-800">
        <div className="text-3xl tracking-wide font-bold text-gray-800">Lieferschein</div>
      </div>

      {/* Einleitungssatz */}
      <div className="text-sm text-gray-800 mb-4">
        Wir bedanken uns für die gute Zusammenarbeit und liefern Ihnen wie vereinbart folgende
        Waren:
      </div>

      {/* Tabelle mit klassischem Corporate-Design */}
      {data.items && data.items.length > 0 && (
        <div className="mb-10">
          <table className="w-full border-collapse border-2 border-gray-800">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="p-4 text-left text-sm font-bold tracking-wide border-r border-gray-600">
                  Pos.
                </th>
                <th className="p-4 text-left text-sm font-bold tracking-wide border-r border-gray-600">
                  Art-Nr.
                </th>
                <th className="p-4 text-left text-sm font-bold tracking-wide border-r border-gray-600">
                  Bezeichnung
                </th>
                <th className="p-4 text-center text-sm font-bold tracking-wide border-r border-gray-600">
                  Menge
                </th>
                <th className="p-4 text-center text-sm font-bold tracking-wide">Einheit</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, idx) => {
                const artNr =
                  (item as any).sku || (item as any).articleNumber || (item as any).artNr || '';
                return (
                  <tr key={idx} className="border-b border-gray-300 align-top">
                    <td className="p-4 text-gray-700 border-r border-gray-300">{idx + 1}</td>
                    <td className="p-4 text-gray-700 whitespace-nowrap border-r border-gray-300">
                      {artNr || '—'}
                    </td>
                    <td className="p-4 border-r border-gray-300">
                      <div className="font-medium text-gray-900">{item.description}</div>
                      {item.details && (
                        <div className="text-sm text-gray-600 mt-1">{item.details}</div>
                      )}
                    </td>
                    <td className="p-4 text-center text-gray-900 border-r border-gray-300">
                      {typeof item.quantity === 'number'
                        ? item.quantity.toLocaleString('de-DE')
                        : (item as any).quantity}
                    </td>
                    <td className="p-4 text-center text-gray-700">{item.unit || 'Stk.'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer mit klassischem Corporate-Design */}
      <div className="mt-10 pt-4 border-t-2 border-gray-800 text-xs text-gray-600">
        <div className="text-center">
          <div className="text-gray-800 font-bold">Corporate Classic • Tradition & Vertrauen</div>
          <div className="mt-2">
            {companySettings?.vatId && <span>USt-IdNr.: {companySettings.vatId}</span>}
            {companySettings?.commercialRegister && (
              <span className="ml-4">HRB: {companySettings.commercialRegister}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorporateClassicDeliveryTemplate;
