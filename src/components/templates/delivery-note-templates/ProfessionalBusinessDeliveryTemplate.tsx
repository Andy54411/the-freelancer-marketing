import React from 'react';
import type { TemplateProps } from '../types';
import { resolveLogoUrl } from '../utils/logoUtils';

// Hilfsfunktion: robustes Datumsformat (fällt auf Rohwert zurück, wenn keine gültige Date-Instanz)
const formatDate = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString('de-DE');
};

// Professional Business Template mit blauen Akzenten
export const ProfessionalBusinessDeliveryTemplate: React.FC<TemplateProps> = ({
  data,
  companySettings,
  customizations,
}) => {
  const logoUrl = resolveLogoUrl(customizations, companySettings, data);

  // Zusätzliche mögliche Felder aus dem Datenobjekt lesen (optional)
  const customerNumber = (data as any).customerNumber as string | undefined;
  const orderNumber = (data as any).orderNumber || (data as any).customerOrderNumber;

  const bankLine = [
    companySettings?.companyName || 'Muster GmbH',
    companySettings?.bankDetails?.bankName || 'Sparkasse Berlin',
    companySettings?.bankDetails?.iban
      ? `IBAN ${companySettings.bankDetails.iban}`
      : 'IBAN DE10 25 25 25 500 600 26 02',
    companySettings?.bankDetails?.bic ? `BIC ${companySettings.bankDetails.bic}` : 'BIC HERAKLES02',
  ]
    .filter(Boolean)
    .join(' · ');

  const legalLine = [
    companySettings?.address?.city || companySettings?.address?.country
      ? `Sitz der Gesellschaft: ${[
          companySettings?.address?.city,
          companySettings?.address?.country,
        ]
          .filter(Boolean)
          .join(', ')}`
      : undefined,
    companySettings?.management ? `Geschäftsführung: ${companySettings.management}` : undefined,
    companySettings?.commercialRegister
      ? `Handelsregister: ${companySettings.commercialRegister}`
      : undefined,
    companySettings?.vatId ? `USt-IdNr. ${companySettings.vatId}` : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="max-w-4xl mx-auto bg-white p-10 font-sans text-gray-900">
      {/* Logo ganz oben */}
      {logoUrl && (
        <div className="mb-4">
          <img src={logoUrl} alt="Logo" className="h-40 w-auto object-contain" />
        </div>
      )}

      {/* Firmenadresse in einer Zeile - direkt oben, keine Bankdaten */}
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
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-blue-300">
        <div className="text-3xl tracking-wide font-light text-blue-800">Lieferschein</div>
      </div>

      {/* Einleitungssatz */}
      <div className="text-sm text-gray-800 mb-4">
        Wir bedanken uns für die gute Zusammenarbeit und liefern Ihnen wie vereinbart folgende
        Waren:
      </div>

      {/* Tabelle gemäß Vorlage: Pos. | Art-Nr. | Bezeichnung | Menge | Einheit */}
      {data.items && data.items.length > 0 && (
        <div className="mb-10">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-blue-600">
                <th className="p-2 text-left text-xs font-semibold tracking-wide">Pos.</th>
                <th className="p-2 text-left text-xs font-semibold tracking-wide">Art-Nr.</th>
                <th className="p-2 text-left text-xs font-semibold tracking-wide">Bezeichnung</th>
                <th className="p-2 text-center text-xs font-semibold tracking-wide">Menge</th>
                <th className="p-2 text-center text-xs font-semibold tracking-wide">Einheit</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, idx) => {
                const artNr =
                  (item as any).sku || (item as any).articleNumber || (item as any).artNr || '';
                return (
                  <tr key={idx} className="border-b border-gray-200 align-top">
                    <td className="p-2 text-gray-700">{idx + 1}</td>
                    <td className="p-2 text-gray-700 whitespace-nowrap">{artNr || '—'}</td>
                    <td className="p-2">
                      <div className="font-medium text-gray-900">{item.description}</div>
                      {item.details && (
                        <div className="text-sm text-gray-600 mt-1">{item.details}</div>
                      )}
                    </td>
                    <td className="p-2 text-center text-gray-900">
                      {typeof item.quantity === 'number'
                        ? item.quantity.toLocaleString('de-DE')
                        : (item as any).quantity}
                    </td>
                    <td className="p-2 text-center text-gray-700">{item.unit || 'Stk.'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer mit rechtlichen Angaben und Bankdaten (wie oben) */}
      {(bankLine || legalLine) && (
        <div className="mt-10 pt-4 border-t border-blue-300 text-[11px] text-gray-600">
          {bankLine && <div className="text-center">{bankLine}</div>}
          {legalLine && <div className="text-center mt-1">{legalLine}</div>}
        </div>
      )}
    </div>
  );
};

export default ProfessionalBusinessDeliveryTemplate;
