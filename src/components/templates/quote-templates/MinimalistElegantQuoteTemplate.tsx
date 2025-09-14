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

  // 💰 Intelligente Preishinweise basierend auf Währung und Steuereinstellungen
  const getPriceNotice = () => {
    const currency = data.currency || 'EUR';
    const isGermanCurrency = currency === 'EUR';
    const isSwissCurrency = currency === 'CHF';
    const priceInput = (data as any).priceInput; // TypeScript-Workaround

    // Schweizer Franken - andere Steuerlogik
    if (isSwissCurrency) {
      if (priceInput === 'brutto') {
        return 'inkl. MwSt.';
      } else {
        return 'zzgl. MwSt.';
      }
    }

    // Deutsche/EU Währung
    if (isGermanCurrency) {
      if (data.isSmallBusiness) {
        return 'als Kleinunternehmer ohne USt.';
      } else if (priceInput === 'brutto') {
        return 'inkl. USt.';
      } else {
        return 'zzgl. USt.';
      }
    }

    // Andere Währungen - generisch
    if (priceInput === 'brutto') {
      return 'inkl. Steuern';
    } else {
      return 'zzgl. anfallender Steuern';
    }
  };

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
            {(() => {
              // Check if any item has a discount
              const hasAnyDiscount =
                data.items?.some(item => item.discountPercent && item.discountPercent > 0) || false;

              return data.items?.map((item, index) => (
                <div key={index} className="border-b border-gray-100 pb-6 last:border-b-0">
                  <div
                    className={`grid gap-4 items-start ${hasAnyDiscount ? 'grid-cols-12' : 'grid-cols-11'}`}
                  >
                    <div className="col-span-1">
                      <span className="text-gray-400 font-light">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <div className={hasAnyDiscount ? 'col-span-6' : 'col-span-7'}>
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
                    {hasAnyDiscount && (
                      <div className="col-span-1 text-center">
                        <span className="text-gray-600 font-light">
                          {!item.category && item.discountPercent && item.discountPercent > 0
                            ? `${item.discountPercent}%`
                            : '-'}
                        </span>
                      </div>
                    )}
                    <div className="col-span-2 text-right">
                      <p className="text-sm text-gray-400 mb-1">{formatCurrency(item.unitPrice)}</p>
                    </div>
                    <div className="col-span-1 text-right">
                      <p className="text-base font-light text-gray-900">
                        {(() => {
                          const discountFactor =
                            item.category === 'discount'
                              ? -1
                              : 1 - (item.discountPercent || 0) / 100;
                          const totalPrice = item.quantity * item.unitPrice * discountFactor;
                          return formatCurrency(totalPrice);
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              ));
            })()}
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
                <p>Alle Beträge verstehen sich {getPriceNotice()}</p>
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
              <p className="mb-1">USt-IdNr.: {companySettings?.vatId}</p>
              {companySettings?.commercialRegister && (
                <p>Handelsregister: {companySettings?.commercialRegister}</p>
              )}
            </div>
            <div>
              <p className="mb-1">IBAN: {companySettings?.bankDetails?.iban}</p>
              <p className="mb-1">BIC: {companySettings?.bankDetails?.bic}</p>
              {companySettings?.bankDetails?.bankName && (
                <p>Bank: {companySettings?.bankDetails?.bankName}</p>
              )}
            </div>
            <div>
              <p className="mb-1">{companySettings?.contactInfo?.phone}</p>
              <p>{companySettings?.contactInfo?.email}</p>
            </div>
          </div>

          {/* 🇩🇪 Deutsche Umsatzsteuer-Hinweistexte */}
          {getTaxNotice() && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-blue-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700 font-medium">{getTaxNotice()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
