import React from 'react';
import { TemplateProps } from '../types';
import { resolveLogoUrl } from '../utils/logoUtils';

export const ProfessionalBusinessQuoteTemplate: React.FC<TemplateProps> = ({
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
      ? new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: data.currency || 'EUR',
        }).format(value)
      : '';

  // 🇩🇪 Deutsche Umsatzsteuer-Hinweistexte nach UStG
  const getTaxNotice = () => {
    switch (data.taxRule) {
      case 'DE_TAXABLE':
        return null; // Keine besonderen Hinweise bei normaler Besteuerung
      case 'DE_EXEMPT_4_USTG':
        return 'Steuerfreie Leistung gemäß § 4 UStG.';
      case 'DE_REVERSE_13B':
        return 'Steuerschuldnerschaft des Leistungsempfängers gemäß § 13b UStG.';
      case 'EU_REVERSE_18B':
        return 'Reverse Charge Verfahren gemäß § 18b UStG (EU).';
      case 'EU_INTRACOMMUNITY_SUPPLY':
        return 'Innergemeinschaftliche Lieferung gemäß § 4 Nr. 1b UStG ist steuerbefreit.';
      case 'EU_OSS':
        return 'Besteuerung nach OSS-Verfahren (One-Stop-Shop).';
      case 'NON_EU_EXPORT':
        return 'Ausfuhrlieferung gemäß § 4 Nr. 1a UStG ist steuerbefreit.';
      case 'NON_EU_OUT_OF_SCOPE':
        return 'Leistung nicht im Inland steuerbar.';
      default:
        // Prüfung auf Kleinunternehmer über isSmallBusiness
        return data.isSmallBusiness ? 'Gemäß § 19 UStG wird keine Umsatzsteuer erhoben.' : null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white font-sans text-sm">
      {/* Kopfbereich */}
      <div className="p-8 pb-6 border-b-2 border-gray-300">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {logoUrl && (
              <img src={logoUrl} alt="Firmenlogo" className="h-12 w-auto mb-4 object-contain" />
            )}
            <h1 className="text-3xl font-bold text-gray-800 mb-1">{data.title || 'Angebot'}</h1>
            <p className="text-gray-600">Angebotsnummer {data.documentNumber}</p>
            {data.reference && <p className="text-gray-600">Referenz: {data.reference}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-gray-800 mb-2">{companySettings?.companyName}</h2>
            <div className="text-gray-600">
              <p>{companySettings?.address?.street}</p>
              <p>
                {companySettings?.address?.zipCode} {companySettings?.address?.city}
              </p>
              <p className="mt-2">{companySettings?.contactInfo?.phone}</p>
              <p>{companySettings?.contactInfo?.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Kopf-Text */}
        {data.headTextHtml && (
          <div className="mb-8 p-4 bg-gray-50 rounded">
            <div dangerouslySetInnerHTML={{ __html: data.headTextHtml }} />
          </div>
        )}
        {/* Kunde & Angebotsdaten */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Kunde</h3>
            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold text-gray-800">{data.customerName}</p>
              <p className="text-gray-700">{data.customerAddress?.street}</p>
              <p className="text-gray-700">
                {data.customerAddress?.zipCode} {data.customerAddress?.city}
              </p>
              {data.customerEmail && <p className="text-gray-700 mt-1">{data.customerEmail}</p>}
              {data.customerContact && (
                <p className="text-gray-700 mt-3 pt-3 border-t border-gray-200">
                  Ansprechpartner: {data.customerContact}
                </p>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Angebotsdetails</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Datum:</span>
                <span className="font-semibold">{formatDate(data.date)}</span>
              </div>
              {data.validUntil && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Gültig bis:</span>
                  <span className="font-semibold">{formatDate(data.validUntil)}</span>
                </div>
              )}
              {data.createdBy && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Erstellt von:</span>
                  <span className="font-semibold">{data.createdBy}</span>
                </div>
              )}
              {data.paymentTerms && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Zahlungsbedingungen:</span>
                  <span className="font-semibold">{data.paymentTerms}</span>
                </div>
              )}
              {data.deliveryTerms && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Lieferbedingungen:</span>
                  <span className="font-semibold">{data.deliveryTerms}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Positionen */}
        <div className="mb-8">
          {(() => {
            // Check if any item has a discount
            const hasAnyDiscount =
              data.items?.some(item => item.discountPercent && item.discountPercent > 0) || false;

            return (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-3 text-left font-bold">Pos.</th>
                    <th className="border border-gray-300 p-3 text-left font-bold">Beschreibung</th>
                    <th className="border border-gray-300 p-3 text-center font-bold">Menge</th>
                    {hasAnyDiscount && (
                      <th className="border border-gray-300 p-3 text-center font-bold">Rabatt</th>
                    )}
                    <th className="border border-gray-300 p-3 text-right font-bold">Einzelpreis</th>
                    <th className="border border-gray-300 p-3 text-right font-bold">Gesamt</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items?.map((item, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 p-3 text-center">
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td className="border border-gray-300 p-3">
                        <div
                          className={`font-semibold text-gray-800${item.category === 'discount' ? ' text-red-600' : ''}`}
                        >
                          {item.description}
                        </div>
                        {item.details && (
                          <div className="text-sm text-gray-600 mt-1">{item.details}</div>
                        )}
                      </td>
                      <td className="border border-gray-300 p-3 text-center">{item.quantity}</td>
                      {hasAnyDiscount && (
                        <td className="border border-gray-300 p-3 text-center">
                          {!item.category && item.discountPercent && item.discountPercent > 0
                            ? `${item.discountPercent}%`
                            : '-'}
                        </td>
                      )}
                      <td className="border border-gray-300 p-3 text-right">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="border border-gray-300 p-3 text-right font-semibold">
                        {(() => {
                          const discountFactor =
                            item.category === 'discount'
                              ? -1
                              : 1 - (item.discountPercent || 0) / 100;
                          const totalPrice = item.quantity * item.unitPrice * discountFactor;
                          return formatCurrency(totalPrice);
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </div>

        {/* Summen */}
        <div className="flex justify-end mb-8">
          <div className="w-80">
            <div className="space-y-2">
              <div className="flex justify-between py-2">
                <span>Zwischensumme:</span>
                <span>{formatCurrency(data.subtotal)}</span>
              </div>
              {typeof data.taxRate === 'number' && data.taxRate > 0 && (
                <div className="flex justify-between py-2">
                  <span>Umsatzsteuer ({data.taxRate}%):</span>
                  <span>{formatCurrency(data.taxAmount)}</span>
                </div>
              )}
              <div className="border-t-2 border-gray-300 pt-2">
                <div className="flex justify-between py-2 text-lg font-bold">
                  <span>Gesamtbetrag:</span>
                  <span>{formatCurrency(data.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fuß-Text */}
        {data.footerText && (
          <div className="mb-8 p-4 bg-gray-50 rounded">
            <div dangerouslySetInnerHTML={{ __html: data.footerText }} />
          </div>
        )}

        {/* Zusätzliche Notizen */}
        {data.notes && (
          <div className="mb-8 p-4 bg-yellow-50 rounded border-l-4 border-yellow-400">
            <h4 className="font-bold text-gray-800 mb-2">Zusätzliche Hinweise</h4>
            <div className="whitespace-pre-line text-gray-700">{data.notes}</div>
          </div>
        )}

        {/* Fußbereich */}
        <div className="pt-6 border-t-2 border-gray-300 text-xs text-gray-700">
          {/* 🇩🇪 Umsatzsteuer-Hinweise */}
          {getTaxNotice() && (
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800 font-medium">{getTaxNotice()}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-8">
            <div>
              <h5 className="font-bold text-gray-800 mb-2">Steuerliche Angaben</h5>
              <p>Steuernummer: {companySettings?.taxId}</p>
              <p>USt-IdNr.: {companySettings?.vatId}</p>
              {companySettings?.commercialRegister && (
                <p>Handelsregister: {companySettings?.commercialRegister}</p>
              )}
            </div>
            <div>
              <h5 className="font-bold text-gray-800 mb-2">Bankverbindung</h5>
              <p>IBAN: {companySettings?.bankDetails?.iban}</p>
              <p>BIC: {companySettings?.bankDetails?.bic}</p>
              {companySettings?.bankDetails?.bankName && (
                <p>Bank: {companySettings?.bankDetails?.bankName}</p>
              )}
            </div>
            <div>
              <h5 className="font-bold text-gray-800 mb-2">Kontakt</h5>
              <p>Telefon: {companySettings?.contactInfo?.phone}</p>
              <p>E-Mail: {companySettings?.contactInfo?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
