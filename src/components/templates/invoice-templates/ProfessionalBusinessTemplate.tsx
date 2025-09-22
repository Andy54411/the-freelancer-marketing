import React from 'react';
import type { CompanySettings, TemplateCustomizations } from '../types';
import { resolveLogoUrl } from '../utils/logoUtils';

interface TemplateProps {
  data: any; // 🔧 Geändert zu any für Flexibilität mit zusätzlichen Feldern
  companySettings?: CompanySettings;
  customizations?: TemplateCustomizations;
}

// 🔧 InvoiceData Interface entfernt - verwende any für maximale Flexibilität

// Hinweis: TemplateProps ist oben bereits mit companySettings/customizations definiert

/**
 * Professional Business Template - Klassisch, sauber, deutscher Standard
 */
export const ProfessionalBusinessTemplate: React.FC<TemplateProps> = ({
  data,
  companySettings,
  customizations,
}) => {
  const logoUrl = resolveLogoUrl(customizations, companySettings, data);
  const showLogo = customizations?.showLogo ?? true;
  // DIN 5008: deutsches Datumsformat und Währungsformat verwenden
  const formatDate = (input: string) => {
    const d = new Date(input);
    return isNaN(d.getTime()) ? input : d.toLocaleDateString('de-DE');
  };
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  const serviceText =
    data.servicePeriod || (data.serviceDate ? formatDate(data.serviceDate) : formatDate(data.date));


  return (
    <div className="w-full max-w-4xl mx-auto bg-white p-8 font-sans text-sm">
      {/* Header */}
      <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-gray-300">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Rechnung</h1>
          <p className="text-lg text-gray-600">Rechnungsnummer {data.documentNumber}</p>
          <h2 className="text-xl font-bold text-gray-800 mt-6 mb-2">{data.company?.name || 'Company Name'}</h2>
          <div className="text-gray-600">
            <p>{data.company?.address?.street}</p>
            <p>{data.company?.address?.zipCode} {data.company?.address?.city}</p>
            {data.company?.phone && <p className="mt-2">{data.company?.phone}</p>}
            {data.company?.email && <p>{data.company?.email}</p>}
            {/* Keine weiteren Felder wie Zahlungsbedingung oder USt-Regel im Header anzeigen */}
          </div>
        </div>
        <div className="flex-shrink-0 text-right ml-8">
          {showLogo && logoUrl && (
            <img
              src={logoUrl}
              alt={`${data.company?.name || 'Company'} Logo`}
              className="h-24 w-auto ml-auto mb-2 object-contain"
            />
          )}
        </div>
      </div>

      {/* Kunde und Daten entfernt (Lieferanschrift wird nicht mehr unter Kopftext angezeigt) */}

      {/* Mehr Optionen / Auswahlfelder (jetzt UNTER dem Kopftext) */}
      {(
        (data.currency && data.currency !== 'EUR') ||
        (data.contactPersonName && data.contactPersonName.trim() !== '') ||
        (data.deliveryTerms && data.deliveryTerms.trim() !== '') ||
        (data.skontoText && data.skontoText.trim() !== '') ||
        (data.skontoDays && data.skontoDays > 0) ||
        (data.skontoPercentage && data.skontoPercentage > 0) ||
        (typeof data.reverseCharge !== 'undefined' && data.reverseCharge !== false) ||
        (data.isSmallBusiness)
      ) && (
        <div className="mb-8">
          <div className="grid grid-cols-2 gap-8">
            <div>
              {data.currency && data.currency !== 'EUR' && (
                <div className="text-gray-600 text-xs mb-1">Währung: <span className="font-semibold">{data.currency}</span></div>
              )}
              {data.contactPersonName && data.contactPersonName.trim() !== '' && (
                <div className="text-gray-600 text-xs mb-1">Kontaktperson: <span className="font-semibold">{data.contactPersonName}</span></div>
              )}
              {data.deliveryTerms && data.deliveryTerms.trim() !== '' && (
                <div className="text-gray-600 text-xs mb-1">Lieferbedingung: <span className="font-semibold">{data.deliveryTerms}</span></div>
              )}
              {(data.skontoText && data.skontoText.trim() !== '') || (data.skontoDays && data.skontoDays > 0) || (data.skontoPercentage && data.skontoPercentage > 0) ? (
                <div className="text-gray-600 text-xs mb-1">
                  Skonto: <span className="font-semibold">
                    {data.skontoText ? data.skontoText : ''}
                    {data.skontoDays && data.skontoDays > 0 ? ` Bei Zahlung binnen ${data.skontoDays} Tagen` : ''}
                    {data.skontoPercentage && data.skontoPercentage > 0 ? ` ${data.skontoPercentage}%` : ''}
                  </span>
                </div>
              ) : null}
            </div>
            <div>
              {typeof data.reverseCharge !== 'undefined' && data.reverseCharge !== false && (
                <div className="text-gray-600 text-xs mb-1">Reverse Charge: <span className="font-semibold">aktiviert</span></div>
              )}
              {data.isSmallBusiness && (
                <div className="text-gray-600 text-xs mb-1">Kleinunternehmerregelung (§19 UStG)</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Kopftext / Header-Text */}
      {(data.description || data.introText || data.headerText) && (
        <div className="mb-6">
          <div className="text-base text-gray-800 whitespace-pre-line" style={{wordBreak: 'break-word'}}>
            {data.description && <div dangerouslySetInnerHTML={{ __html: data.description }} />}
            {!data.description && data.introText && <div dangerouslySetInnerHTML={{ __html: data.introText }} />}
            {!data.description && !data.introText && data.headerText && <div dangerouslySetInnerHTML={{ __html: data.headerText }} />}
          </div>
        </div>
      )}

      {/* Artikel Tabelle */}
      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-3 text-left font-bold">Position</th>
              <th className="border border-gray-300 p-3 text-left font-bold">Beschreibung</th>
              <th className="border border-gray-300 p-3 text-center font-bold">Menge</th>
              <th className="border border-gray-300 p-3 text-right font-bold">Einzelpreis</th>
              {data.items && data.items.some((item) => item.discountPercent > 0 || item.discount > 0) ? (
                <th className="border border-gray-300 p-3 text-right font-bold">Rabatt</th>
              ) : null}
              <th className="border border-gray-300 p-3 text-right font-bold">Gesamtpreis</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index}>
                <td className="border border-gray-300 p-3 text-center">{index + 1}</td>
                <td className="border border-gray-300 p-3">{item.description}</td>
                <td className="border border-gray-300 p-3 text-center">
                  {item.quantity} {item.unit}
                </td>
                <td className="border border-gray-300 p-3 text-right">
                  {formatCurrency(item.unitPrice)}
                </td>
                {data.items && data.items.some((itm) => itm.discountPercent > 0 || itm.discount > 0) ? (
                  <td className="border border-gray-300 p-3 text-right text-red-600">
                    {(item.discountPercent > 0 || item.discount > 0)
                      ? `${item.discountPercent > 0 ? item.discountPercent : item.discount}%`
                      : ''}
                  </td>
                ) : null}
                <td className="border border-gray-300 p-3 text-right font-semibold">
                  {(() => {
                    const discount = item.discountPercent > 0
                      ? (item.unitPrice * item.quantity) * (item.discountPercent / 100)
                      : (item.discount > 0 ? (item.unitPrice * item.quantity) * (item.discount / 100) : 0);
                    const total = (item.unitPrice * item.quantity) - discount;
                    return formatCurrency(total);
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>



      {/* Debug-Ausgabe für Summenbereich */}
      {process.env.NODE_ENV !== 'production' && (
        <pre className="text-xs text-red-500 bg-gray-100 p-2 mb-2">
          {JSON.stringify({ currency: data.currency, paymentTerms: data.paymentTerms, taxRule: data.taxRule, taxRate: data.taxRate, taxAmount: data.taxAmount }, null, 2)}
        </pre>
      )}

      {/* Summenbereich mit Infos links */}
      <div className="flex flex-row justify-end mb-8 gap-4">
        {/* Linke Spalte: Währung, Zahlungsbedingung, Steuerregel */}
        <div className="flex flex-col text-sm text-gray-700 min-w-[220px]">
          {/* Währung, Kontaktperson und Zahlungsbedingung werden nur oben im Optionen-Block angezeigt */}
          {data.taxRule && (
            <div>
              <span className="font-semibold">Steuerregel:</span> {data.taxRule === 'DE_TAXABLE' ? 'In Deutschland steuerpflichtig' : data.taxRule}
            </div>
          )}
        </div>
        {/* Rechte Spalte: Summen */}
        <div className="w-80">
          <div className="space-y-2">
            <div className="flex justify-between py-2">
              <span>Zwischensumme:</span>
              <span>{formatCurrency(data.subtotal)}</span>
            </div>
            {data.taxRate > 0 && (
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

      {/* 🔧 ABSCHLUSSTEXT - Direkt nach Gesamtsumme ohne Titel und grauen Hintergrund */}
      {(data.hinweise || data.additionalNotes || data.paymentNotes || data.conclusionText) && (
        <div className="mt-3 mb-8">
          <div className="text-sm text-gray-700 space-y-2">
            {data.hinweise && (
              <div dangerouslySetInnerHTML={{ __html: data.hinweise }} />
            )}
            {!data.hinweise && data.additionalNotes && (
              <div dangerouslySetInnerHTML={{ __html: data.additionalNotes }} />
            )}
            {!data.hinweise && !data.additionalNotes && data.paymentNotes && (
              <div dangerouslySetInnerHTML={{ __html: data.paymentNotes }} />
            )}
            {!data.hinweise && !data.additionalNotes && !data.paymentNotes && data.conclusionText && (
              <div dangerouslySetInnerHTML={{ __html: data.conclusionText }} />
            )}
          </div>
        </div>
      )}

      {/* Footer / Compliance */}
      <div className="border-t-2 border-gray-300 pt-6 text-xs text-gray-700">
        <div className="grid grid-cols-3 gap-8">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Bankverbindung</h4>
            {data.company.bankDetails.iban && <p>IBAN: {data.company.bankDetails.iban}</p>}
            {data.company.bankDetails.bic && <p>BIC: {data.company.bankDetails.bic}</p>}
            {data.company.bankDetails.accountHolder && (
              <p>Kontoinhaber: {data.company.bankDetails.accountHolder}</p>
            )}
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Steuerdaten</h4>
            {data.company.vatId && <p>USt-IdNr.: {data.company.vatId}</p>}
            {data.company.taxNumber && <p>Steuernr.: {data.company.taxNumber}</p>}
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Hinweise</h4>
            {data.isSmallBusiness && (
              <p>Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).</p>
            )}
            {!data.isSmallBusiness && data.reverseCharge && (
              <p>Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG).</p>
            )}
            {/* 🔧 Hinweis: data.notes wurde entfernt - Footer-Text erscheint jetzt als separater Abschlusstext-Block */}
          </div>
        </div>
        <div className="mt-4 text-gray-600">
          <p>
            Bitte überweisen Sie den Gesamtbetrag bis zum {formatDate(data.dueDate)} unter Angabe
            der Rechnungsnummer auf das oben genannte Konto.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalBusinessTemplate;
