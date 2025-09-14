import React from 'react';
import { TemplateProps } from '../types';
import { resolveLogoUrl } from '../utils/logoUtils';

export const CorporateClassicQuoteTemplate: React.FC<TemplateProps> = ({
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
    <div className="max-w-4xl mx-auto bg-white p-8 font-serif text-sm">
      {/* Kopfbereich */}
      <div className="pb-6 mb-8 border-b-2 border-gray-300">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {logoUrl && (
              <img src={logoUrl} alt="Firmenlogo" className="h-14 w-auto mb-6 object-contain" />
            )}
            <h1 className="text-3xl font-bold text-gray-900 mb-1">{data.title || 'Angebot'}</h1>
            <p className="text-gray-600">Referenz {data.documentNumber}</p>
            {data.reference && <p className="text-gray-600">Referenz: {data.reference}</p>}
          </div>
          <div className="text-right bg-gray-50 p-6 rounded border">
            <h2 className="font-bold text-lg text-gray-900 mb-2">{companySettings?.companyName}</h2>
            <div className="text-gray-700 space-y-1">
              <p>{companySettings?.address?.street}</p>
              <p>
                {companySettings?.address?.zipCode} {companySettings?.address?.city}
              </p>
              <div className="mt-3 pt-3 border-t border-gray-300">
                <p>Tel: {companySettings?.contactInfo?.phone}</p>
                <p>E-Mail: {companySettings?.contactInfo?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Kunde & Angebotsinformationen */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3 border-b border-gray-300 pb-2">
            Kundendaten
          </h3>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-gray-900">{data.customerName}</p>
            <p className="text-gray-700">{data.customerAddress?.street}</p>
            <p className="text-gray-700">
              {data.customerAddress?.zipCode} {data.customerAddress?.city}
            </p>
            {data.customerEmail && <p className="text-gray-700">{data.customerEmail}</p>}
            {data.customerContact && (
              <div className="mt-3 pt-3 border-t border-gray-300">
                <p className="text-gray-700">Ansprechpartner: {data.customerContact}</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3 border-b border-gray-300 pb-2">
            Angebotsdetails
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Datum:</span>
              <span className="font-semibold text-gray-900">{formatDate(data.date)}</span>
            </div>
            {data.validUntil && (
              <div className="flex justify-between">
                <span className="text-gray-600">Gültig bis:</span>
                <span className="font-semibold text-gray-900">{formatDate(data.validUntil)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Erstellt von:</span>
              <span className="font-semibold text-gray-900">{data.createdBy || 'Team'}</span>
            </div>
            {data.paymentTerms && (
              <div className="flex justify-between">
                <span className="text-gray-600">Zahlungsbedingungen:</span>
                <span className="font-semibold text-gray-900">{data.paymentTerms}</span>
              </div>
            )}
            {data.deliveryTerms && (
              <div className="flex justify-between">
                <span className="text-gray-600">Lieferbedingungen:</span>
                <span className="font-semibold text-gray-900">{data.deliveryTerms}</span>
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

      {/* Leistungen & Preise */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Leistungen & Preise</h3>
        <table className="w-full border-collapse border border-gray-400">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-3 text-left font-bold">Pos.</th>
              <th className="border border-gray-300 p-3 text-left font-bold">Beschreibung</th>
              <th className="border border-gray-300 p-3 text-center font-bold">Menge</th>
              <th className="border border-gray-300 p-3 text-center font-bold">Rabatt</th>
              <th className="border border-gray-300 p-3 text-right font-bold">Einzelpreis</th>
              <th className="border border-gray-300 p-3 text-right font-bold">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            {data.items?.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-gray-300 p-3 text-center">
                  {String(index + 1).padStart(2, '0')}
                </td>
                <td className="border border-gray-300 p-3">
                  <div
                    className={`font-semibold text-gray-900${item.category === 'discount' ? ' text-red-600' : ''}`}
                  >
                    {item.description}
                  </div>
                  {item.details && (
                    <div className="text-sm text-gray-600 mt-1 leading-relaxed">{item.details}</div>
                  )}
                </td>
                <td className="border border-gray-300 p-3 text-center">{item.quantity}</td>
                <td className="border border-gray-300 p-3 text-center">
                  {!item.category && item.discountPercent && item.discountPercent > 0
                    ? `${item.discountPercent}%`
                    : '-'}
                </td>
                <td className="border border-gray-300 p-3 text-right">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="border border-gray-300 p-3 text-right font-semibold">
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

      {/* Zusammenfassung */}
      <div className="flex justify-end mb-8">
        <div className="w-96 border border-gray-400 rounded">
          <div className="bg-gray-100 p-4">
            <h4 className="font-bold text-lg text-gray-900">Zusammenfassung</h4>
          </div>
          <div className="p-4 bg-white">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Zwischensumme:</span>
                <span>{formatCurrency(data.subtotal)}</span>
              </div>
              {typeof data.taxRate === 'number' && data.taxRate > 0 && (
                <div className="flex justify-between items-center">
                  <span>Umsatzsteuer ({data.taxRate}%):</span>
                  <span>{formatCurrency(data.taxAmount)}</span>
                </div>
              )}
              <div className="border-t border-gray-300 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">Gesamtbetrag:</span>
                  <span className="text-xl font-bold">{formatCurrency(data.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bedingungen */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="border border-gray-300 rounded p-6 bg-gray-50">
          <h4 className="font-bold text-gray-900 mb-3 text-base">Bedingungen</h4>
          <ul className="text-gray-700 space-y-1 text-sm">
            {data.paymentTerms && <li>• Zahlungsbedingungen: {data.paymentTerms}</li>}
            <li>• Angebot gültig bis: {formatDate(data.validUntil)}</li>
            {data.deliveryTerms && <li>• Lieferung/Leistung: {data.deliveryTerms}</li>}
            <li>
              • Alle Preise verstehen sich{' '}
              {data.isSmallBusiness ? 'als Kleinunternehmer ohne USt.' : 'zzgl. USt.'}
            </li>
          </ul>
        </div>
        <div className="border border-gray-300 rounded p-6 bg-gray-50">
          <h4 className="font-bold text-gray-900 mb-3 text-base">Hinweise</h4>
          <ul className="text-gray-700 space-y-1 text-sm">
            <li>• Individuelle Anpassungen möglich</li>
            <li>• Rückfragen jederzeit willkommen</li>
            <li>• Ansprechpartner: {data.createdBy || 'Team'}</li>
          </ul>
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
      <div className="border-t-2 border-gray-300 pt-6">
        <div className="grid grid-cols-3 gap-8 text-sm text-gray-700 mb-6">
          <div>
            <h5 className="font-bold text-gray-900 mb-2">Unternehmensdaten</h5>
            <p>Steuernummer: {companySettings?.taxId}</p>
            <p>USt-IdNr.: {companySettings?.vatId}</p>
            <p>Handelsregister: {companySettings?.commercialRegister}</p>
          </div>
          <div>
            <h5 className="font-bold text-gray-900 mb-2">Bankdaten</h5>
            <p>IBAN: {companySettings?.bankDetails?.iban}</p>
            <p>BIC: {companySettings?.bankDetails?.bic}</p>
            <p>Bank: {companySettings?.bankDetails?.bankName}</p>
          </div>
          <div>
            <h5 className="font-bold text-gray-900 mb-2">Kontakt</h5>
            <p>Telefon: {companySettings?.contactInfo?.phone}</p>
            <p>E-Mail: {companySettings?.contactInfo?.email}</p>
            <p>Web: {companySettings?.contactInfo?.website}</p>
          </div>
        </div>
        <div className="text-center text-gray-600 text-sm">Vielen Dank für Ihr Interesse.</div>
      </div>
    </div>
  );
};
