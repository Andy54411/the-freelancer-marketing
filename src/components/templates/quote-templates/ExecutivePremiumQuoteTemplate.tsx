import React from 'react';
import { TemplateProps } from '../types';
import { resolveLogoUrl } from '../utils/logoUtils';

export const ExecutivePremiumQuoteTemplate: React.FC<TemplateProps> = ({
  data,
  companySettings,
  customizations,
}) => {
  const logoUrl = resolveLogoUrl(customizations, companySettings, data);
  const formatDate = (input?: string) => {
    if (!input) return '';
    const d = new Date(input);
    return isNaN(d.getTime()) ? input : d.toLocaleDateString('de-DE');
  };
  const formatCurrency = (value?: number) =>
    typeof value === 'number'
      ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)
      : '';

  return (
    <div className="max-w-4xl mx-auto bg-white font-serif text-sm">
      {/* Kopfbereich */}
      <div className="p-8 border-b-2 border-gray-300">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {logoUrl && (
              <img src={logoUrl} alt="Firmenlogo" className="h-14 w-auto mb-4 object-contain" />
            )}
            <h1 className="text-3xl font-bold mb-1 text-gray-900">{data.title || 'Angebot'}</h1>
            <p className="text-gray-600">Referenz {data.documentNumber}</p>
            {data.reference && <p className="text-gray-600">Ihre Referenz: {data.reference}</p>}
          </div>
          <div className="text-right">
            <h3 className="font-bold text-lg mb-2 text-gray-900">{companySettings?.companyName}</h3>
            <div className="text-gray-700 text-sm space-y-1">
              <p>{companySettings?.address?.street}</p>
              <p>
                {companySettings?.address?.zipCode} {companySettings?.address?.city}
              </p>
              <div className="mt-3 pt-3 border-t border-gray-300">
                <p>{companySettings?.contactInfo?.phone}</p>
                <p>{companySettings?.contactInfo?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Kopf-Text */}
        {data.headTextHtml && (
          <div className="mb-8 p-6 bg-gray-50 rounded-lg border-l-4 border-gray-400">
            <div dangerouslySetInnerHTML={{ __html: data.headTextHtml }} />
          </div>
        )}

        {/* Kunde & Angebotsdetails */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="col-span-2 bg-gray-50 p-6 rounded">
            <h3 className="text-sm font-bold text-gray-600 mb-3">Kunde</h3>
            <div className="space-y-2">
              <h4 className="text-xl font-semibold text-gray-900">{data.customerName}</h4>
              <div className="text-gray-700 space-y-1">
                <p>{data.customerAddress?.street}</p>
                <p>
                  {data.customerAddress?.zipCode} {data.customerAddress?.city}
                </p>
                {data.customerEmail && <p>{data.customerEmail}</p>}
              </div>
              {data.customerContact && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <p className="text-gray-700">Ansprechpartner: {data.customerContact}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-gray-300 p-4 rounded">
              <h4 className="font-semibold text-gray-700 mb-1">Datum</h4>
              <p className="text-lg font-bold text-gray-900">{formatDate(data.date)}</p>
            </div>
            {data.validUntil && (
              <div className="bg-white border border-gray-300 p-4 rounded">
                <h4 className="font-semibold text-gray-700 mb-1">Gültig bis</h4>
                <p className="text-lg font-bold text-gray-900">{formatDate(data.validUntil)}</p>
              </div>
            )}
            {data.paymentTerms && (
              <div className="bg-white border border-gray-300 p-4 rounded">
                <h4 className="font-semibold text-gray-700 mb-1">Zahlungsbedingungen</h4>
                <p className="text-sm text-gray-900">{data.paymentTerms}</p>
              </div>
            )}
            {data.deliveryTerms && (
              <div className="bg-white border border-gray-300 p-4 rounded">
                <h4 className="font-semibold text-gray-700 mb-1">Lieferbedingungen</h4>
                <p className="text-sm text-gray-900">{data.deliveryTerms}</p>
              </div>
            )}
          </div>
        </div>

        {/* Leistungen */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Leistungen & Preise</h3>
          <div className="overflow-hidden rounded border border-gray-300">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-900">
                  <th className="p-3 text-left font-bold">Pos.</th>
                  <th className="p-3 text-left font-bold">Beschreibung</th>
                  <th className="p-3 text-center font-bold">Menge</th>
                  <th className="p-3 text-center font-bold">Rabatt</th>
                  <th className="p-3 text-right font-bold">Einzelpreis</th>
                  <th className="p-3 text-right font-bold">Gesamt</th>
                </tr>
              </thead>
              <tbody>
                {data.items?.map((item, index) => (
                  <tr
                    key={index}
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-t border-gray-200`}
                  >
                    <td className="p-3 text-center">{String(index + 1).padStart(2, '0')}</td>
                    <td className="p-3">
                      <div className="font-semibold text-gray-900">{item.description}</div>
                      {item.details && (
                        <div className="text-gray-600 mt-1 text-sm leading-relaxed">
                          {item.details}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-3 py-1 rounded-full border border-gray-300 bg-white font-medium">
                        {item.quantity}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-1 rounded bg-gray-100 text-sm font-medium">
                        {!item.category && item.discountPercent && item.discountPercent > 0
                          ? `${item.discountPercent}%`
                          : '-'}
                      </span>
                    </td>
                    <td className="p-3 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="p-3 text-right font-semibold">
                      {(() => {
                        const discountFactor =
                          item.category === 'discount' ? -1 : 1 - (item.discountPercent || 0) / 100;
                        const totalPrice = item.quantity * item.unitPrice * discountFactor;
                        return formatCurrency(totalPrice);
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Zusammenfassung */}
        <div className="flex justify-end mb-8">
          <div className="w-96">
            <div className="bg-gray-100 rounded-t p-4">
              <h4 className="font-bold text-lg text-gray-900">Zusammenfassung</h4>
            </div>
            <div className="bg-white border border-gray-300 rounded-b p-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Zwischensumme:</span>
                  <span className="font-semibold">{formatCurrency(data.subtotal)}</span>
                </div>
                {typeof data.taxRate === 'number' && data.taxRate > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Umsatzsteuer ({data.taxRate}%):</span>
                    <span className="font-semibold">{formatCurrency(data.taxAmount)}</span>
                  </div>
                )}
                <div className="border-t border-gray-300 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Gesamtbetrag:</span>
                    <span className="text-xl font-bold text-gray-900">
                      {formatCurrency(data.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fuß-Text */}
        {data.footerText && (
          <div className="mb-8 p-6 bg-gray-50 rounded-lg border-l-4 border-gray-400">
            <div dangerouslySetInnerHTML={{ __html: data.footerText }} />
          </div>
        )}

        {/* Zusätzliche Notizen */}
        {data.notes && (
          <div className="mb-8 p-6 bg-blue-50 rounded-lg border-l-4 border-blue-400">
            <h4 className="font-bold text-gray-900 mb-2">Weitere Hinweise</h4>
            <div className="whitespace-pre-line text-gray-700">{data.notes}</div>
          </div>
        )}

        {/* Fußbereich */}
        <div className="border-t border-gray-300 pt-8">
          <div className="grid grid-cols-3 gap-8 text-sm text-gray-700 mb-6">
            <div>
              <h5 className="font-bold text-gray-900 mb-2">Unternehmensangaben</h5>
              <p>Steuernummer: {companySettings?.taxId}</p>
              <p>USt-IdNr.: {companySettings?.vatId}</p>
            </div>
            <div>
              <h5 className="font-bold text-gray-900 mb-2">Bankverbindung</h5>
              <p>IBAN: {companySettings?.bankDetails?.iban}</p>
              <p>BIC: {companySettings?.bankDetails?.bic}</p>
            </div>
            <div>
              <h5 className="font-bold text-gray-900 mb-2">Kontakt</h5>
              <p>{companySettings?.contactInfo?.phone}</p>
              <p>{companySettings?.contactInfo?.email}</p>
            </div>
          </div>
          <div className="text-center text-gray-600">Vielen Dank für Ihr Vertrauen.</div>
        </div>
      </div>
    </div>
  );
};
