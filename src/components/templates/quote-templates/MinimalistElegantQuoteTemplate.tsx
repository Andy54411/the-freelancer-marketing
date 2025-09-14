import React from 'react';
import { TemplateProps } from '../types';
import { resolveLogoUrl } from '../utils/logoUtils';

export const MinimalistElegantQuoteTemplate: React.FC<TemplateProps> = ({
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
    <div className="max-w-4xl mx-auto bg-white font-light text-sm">
      {/* Kopf */}
      <div className="border-b border-gray-200 pb-8 mb-8">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {logoUrl && (
              <img src={logoUrl} alt="Firmenlogo" className="h-12 w-auto mb-8 object-contain" />
            )}
            <h1 className="text-4xl font-thin text-gray-900 mb-2 tracking-wider">
              {data.title || 'Angebot'}
            </h1>
            <p className="text-gray-500 text-base tracking-wide">{data.documentNumber}</p>
            {data.reference && <p className="text-gray-600">Referenz: {data.reference}</p>}
          </div>
          <div className="text-right text-gray-600 space-y-1">
            <h2 className="font-medium text-lg text-gray-900 mb-1">
              {companySettings?.companyName}
            </h2>
            <p className="text-sm">{companySettings?.address?.street}</p>
            <p className="text-sm">
              {companySettings?.address?.zipCode} {companySettings?.address?.city}
            </p>
            <p className="text-sm mt-3">{companySettings?.contactInfo?.phone}</p>
            <p className="text-sm">{companySettings?.contactInfo?.email}</p>
          </div>
        </div>
      </div>

      <div className="space-y-10">
        {/* Kunde */}
        <div className="grid grid-cols-2 gap-12">
          <div>
            <h3 className="text-xs uppercase tracking-widest text-gray-400 mb-3 font-medium">
              Kunde
            </h3>
            <div className="space-y-2">
              <h4 className="text-xl font-light text-gray-900">{data.customerName}</h4>
              <p className="text-gray-600">{data.customerAddress?.street}</p>
              <p className="text-gray-600">
                {data.customerAddress?.zipCode} {data.customerAddress?.city}
              </p>
              {data.customerEmail && <p className="text-gray-700">{data.customerEmail}</p>}
              {data.customerContact && (
                <p className="text-gray-600 mt-4 pt-4 border-t border-gray-100">
                  Ansprechpartner: {data.customerContact}
                </p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-widest text-gray-400 mb-3 font-medium">
              Details
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Datum</p>
                <p className="text-lg font-light">{formatDate(data.date)}</p>
              </div>
              {data.validUntil && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Gültig bis</p>
                  <p className="text-lg font-light">{formatDate(data.validUntil)}</p>
                </div>
              )}
              {data.paymentTerms && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">
                    Zahlungsbedingungen
                  </p>
                  <p className="text-lg font-light">{data.paymentTerms}</p>
                </div>
              )}
              {data.deliveryTerms && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">
                    Lieferbedingungen
                  </p>
                  <p className="text-lg font-light">{data.deliveryTerms}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kopf-Text */}
        {data.headTextHtml && (
          <div className="mb-8 p-4 bg-gray-50 rounded border-l-4 border-gray-400">
            <div dangerouslySetInnerHTML={{ __html: data.headTextHtml }} />
          </div>
        )}

        {/* Leistungen */}
        <div>
          <h3 className="text-xs uppercase tracking-widest text-gray-400 mb-6 font-medium">
            Leistungen & Preise
          </h3>
          <div className="space-y-6">
            {data.items?.map((item, index) => (
              <div key={index} className="border-b border-gray-100 pb-6 last:border-b-0">
                <div className="grid grid-cols-12 gap-4 items-start">
                  <div className="col-span-1">
                    <span className="text-gray-400 font-light">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="col-span-6">
                    <h4
                      className={`text-base font-light text-gray-900 mb-1${item.category === 'discount' ? ' text-red-600' : ''}`}
                    >
                      {item.description}
                    </h4>
                    {item.details && (
                      <p className="text-sm text-gray-500 leading-relaxed">{item.details}</p>
                    )}
                  </div>
                  <div className="col-span-1 text-center">
                    <span className="text-gray-600 font-light">{item.quantity}</span>
                  </div>
                  <div className="col-span-1 text-center">
                    <span className="text-gray-600 font-light">
                      {!item.category && item.discountPercent && item.discountPercent > 0
                        ? `${item.discountPercent}%`
                        : '-'}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-sm text-gray-400 mb-1">{formatCurrency(item.unitPrice)}</p>
                  </div>
                  <div className="col-span-1 text-right">
                    <p className="text-base font-light text-gray-900">
                      {(() => {
                        const discountFactor =
                          item.category === 'discount' ? -1 : 1 - (item.discountPercent || 0) / 100;
                        const totalPrice = item.quantity * item.unitPrice * discountFactor;
                        return formatCurrency(totalPrice);
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summen */}
        <div className="flex justify-end">
          <div className="w-80 space-y-3">
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-500 font-light">Zwischensumme</span>
              <span className="text-gray-900 font-light">{formatCurrency(data.subtotal)}</span>
            </div>
            {typeof data.taxRate === 'number' && data.taxRate > 0 && (
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500 font-light">Umsatzsteuer ({data.taxRate}%)</span>
                <span className="text-gray-900 font-light">{formatCurrency(data.taxAmount)}</span>
              </div>
            )}
            <div className="border-gray-200 pt-3 border-t">
              <div className="flex justify-between items-center">
                <span className="text-lg font-light text-gray-900">Gesamt</span>
                <span className="text-xl font-light text-gray-900">
                  {formatCurrency(data.total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bedingungen & Hinweise */}
        <div className="pt-8 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-12">
            <div>
              <h4 className="text-xs uppercase tracking-widest text-gray-400 mb-3 font-medium">
                Bedingungen
              </h4>
              <div className="space-y-2 text-sm text-gray-600">
                {data.paymentTerms && <p>Zahlungsbedingungen: {data.paymentTerms}</p>}
                <p>Angebot gültig bis: {formatDate(data.validUntil)}</p>
                {data.deliveryTerms && <p>Lieferung/Leistung: {data.deliveryTerms}</p>}
                <p>
                  Alle Beträge verstehen sich{' '}
                  {data.isSmallBusiness
                    ? 'als Kleinunternehmer ohne USt.'
                    : 'zzgl. gesetzlicher USt.'}
                </p>
              </div>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-widest text-gray-400 mb-3 font-medium">
                Hinweise
              </h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Vielen Dank für Ihre Anfrage</p>
                <p>Wir freuen uns auf die Zusammenarbeit</p>
                <p>Bei Fragen stehen wir jederzeit zur Verfügung</p>
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

        {/* Zusätzliche Notizen */}
        {data.notes && (
          <div className="mb-8 p-4 bg-yellow-50 rounded border-l-4 border-yellow-400">
            <h4 className="font-bold text-gray-800 mb-2">Hinweise</h4>
            <div className="whitespace-pre-line text-gray-700">{data.notes}</div>
          </div>
        )}

        {/* Fuß */}
        <div className="pt-8 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-8 text-xs text-gray-500">
            <div>
              <p className="mb-1">Steuernummer: {companySettings?.taxId}</p>
              <p>USt-IdNr.: {companySettings?.vatId}</p>
            </div>
            <div>
              <p className="mb-1">IBAN: {companySettings?.bankDetails?.iban}</p>
              <p>BIC: {companySettings?.bankDetails?.bic}</p>
            </div>
            <div>
              <p className="mb-1">{companySettings?.contactInfo?.phone}</p>
              <p>{companySettings?.contactInfo?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
