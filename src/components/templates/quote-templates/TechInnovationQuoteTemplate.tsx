import React from 'react';
import { TemplateProps } from '../types';
import { resolveLogoUrl } from '../utils/logoUtils';

export const TechInnovationQuoteTemplate: React.FC<TemplateProps> = ({
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
    <div className="max-w-4xl mx-auto bg-white font-sans text-sm">
      {/* Kopfbereich */}
      <div className="p-8 border-b-2 border-gray-300">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {logoUrl && (
              <img src={logoUrl} alt="Firmenlogo" className="h-12 w-auto mb-4 object-contain" />
            )}
            <h1 className="text-3xl font-bold text-gray-900 mb-1">{data.title || 'Angebot'}</h1>
            <p className="text-gray-600">ID {data.documentNumber}</p>
            {data.reference && <p className="text-gray-600">Referenz: {data.reference}</p>}
          </div>
          <div className="text-right">
            <h2 className="font-bold text-lg text-gray-900 mb-2">{companySettings?.companyName}</h2>
            <div className="text-gray-700 space-y-1 text-sm">
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
          <div className="mb-8 p-4 bg-gray-50 rounded border-l-4 border-gray-400">
            <div dangerouslySetInnerHTML={{ __html: data.headTextHtml }} />
          </div>
        )}

        {/* Kunde & Angebotsinfo */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="bg-gray-50 p-6 rounded">
            <h3 className="text-sm font-bold text-gray-600 mb-3">Kunde</h3>
            <div className="space-y-2">
              <div className="text-gray-900 text-lg font-semibold">{data.customerName}</div>
              <div className="text-gray-700">{data.customerAddress?.street}</div>
              <div className="text-gray-700">
                {data.customerAddress?.zipCode} {data.customerAddress?.city}
              </div>
              {data.customerContact && (
                <div className="mt-4 pt-4 border-t border-gray-200 text-gray-700">
                  Ansprechpartner: {data.customerContact}
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
          <div className="space-y-3">
            {data.items?.map((item, index) => {
              const discountFactor =
                item.category === 'discount' ? -1 : 1 - (item.discountPercent || 0) / 100;
              const totalPrice = item.quantity * item.unitPrice * discountFactor;
              const isDiscount = item.category === 'discount';

              return (
                <div key={index} className="bg-white border border-gray-200 rounded p-4">
                  <div className="grid grid-cols-12 gap-4 items-start">
                    <div className="col-span-1">
                      <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-gray-700 font-semibold">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                    </div>
                    <div className="col-span-6">
                      <div
                        className={`font-semibold ${isDiscount ? 'text-red-600' : 'text-gray-900'}`}
                      >
                        {item.description}
                      </div>
                      {item.details && (
                        <div className="text-sm text-gray-600 mt-1">{item.details}</div>
                      )}
                    </div>
                    <div className="col-span-1 text-center">
                      <div className="text-xs text-gray-500">Menge</div>
                      <div className="bg-gray-50 rounded px-3 py-1 inline-block text-gray-800 font-medium">
                        {item.quantity}
                        {item.unit && (
                          <span className="text-gray-600 text-sm ml-1">{item.unit}</span>
                        )}
                      </div>
                    </div>
                    <div className="col-span-1 text-center">
                      <div className="text-xs text-gray-500">Rabatt</div>
                      <div className="bg-gray-50 rounded px-3 py-1 inline-block text-gray-800 font-medium">
                        {!isDiscount && item.discountPercent && item.discountPercent > 0
                          ? `${item.discountPercent}%`
                          : '-'}
                      </div>
                    </div>
                    <div className="col-span-2 text-right">
                      <div className="text-xs text-gray-500">Einzelpreis</div>
                      <div className={`font-semibold ${isDiscount ? 'text-red-600' : ''}`}>
                        {formatCurrency(item.unitPrice)}
                      </div>
                    </div>
                    <div className="col-span-1 text-right">
                      <div className="text-xs text-gray-500">Gesamt</div>
                      <div className={`font-bold ${isDiscount ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatCurrency(totalPrice)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Zusammenfassung */}
        <div className="flex justify-end mb-8">
          <div className="w-96 bg-white border border-gray-300 rounded">
            <div className="bg-gray-100 p-4">
              <h4 className="font-bold text-gray-900">Zusammenfassung</h4>
            </div>
            <div className="p-6 space-y-3">
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

        {/* Fuß-Text */}
        {data.footerText && (
          <div className="mb-8 p-4 bg-gray-50 rounded border-l-4 border-gray-400">
            <div dangerouslySetInnerHTML={{ __html: data.footerText }} />
          </div>
        )}

        {/* Notizen */}
        {data.notes && (
          <div className="mb-8 p-4 bg-yellow-50 rounded border-l-4 border-yellow-400">
            <h4 className="font-bold text-gray-800 mb-2">Hinweise</h4>
            <div className="whitespace-pre-line text-gray-700">{data.notes}</div>
          </div>
        )}

        {/* Fußbereich */}
        <div className="border-t border-gray-300 pt-6">
          <div className="grid grid-cols-3 gap-8 text-sm text-gray-700">
            <div>
              <h5 className="font-bold text-gray-900 mb-2">Unternehmen</h5>
              <p>Steuernummer: {companySettings?.taxId}</p>
              <p>USt-IdNr.: {companySettings?.vatId}</p>
            </div>
            <div>
              <h5 className="font-bold text-gray-900 mb-2">Bank</h5>
              <p>IBAN: {companySettings?.bankDetails?.iban}</p>
              <p>BIC: {companySettings?.bankDetails?.bic}</p>
            </div>
            <div>
              <h5 className="font-bold text-gray-900 mb-2">Kontakt</h5>
              <p>{companySettings?.contactInfo?.phone}</p>
              <p>{companySettings?.contactInfo?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
