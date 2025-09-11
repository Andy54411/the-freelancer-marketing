import React from 'react';
import { InvoiceData } from './types';

interface TemplateProps {
  data: InvoiceData;
  preview?: boolean;
}

/**
 * Moderne Business-Rechnungsvorlage
 *
 * Features:
 * - Taskilo Branding (#14ad9f)
 * - Modern Corporate Design mit Gradient
 * - Logo-Integration prominent oben
 * - Professional Layout mit Footer
 * - Deutsche Rechtskonformität
 * - Flexbox Layout für perfekte Positionierung
 */
export const ModernBusinessTemplate: React.FC<TemplateProps> = ({ data, preview = false }) => {
  return (
    <div className="w-full max-w-[595px] min-h-[842px] bg-white font-sans text-sm leading-normal flex flex-col mx-auto">
      {/* Header mit Gradient-Background */}
      <div className="bg-gradient-to-r from-[#14ad9f] to-[#0f9d84] text-white p-8 mb-8">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {/* Logo prominent links oben */}
            {data.companyLogo && data.companyLogo.trim() !== '' ? (
              <div className="mb-4">
                <img
                  src={data.companyLogo}
                  alt={`${data.companyName} Logo`}
                  className="h-20 w-auto max-w-[200px] object-contain filter brightness-0 invert"
                  onError={e => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="mb-4 p-3 border-2 border-white border-opacity-30 rounded text-center min-w-[150px]">
                <div className="text-sm text-white font-bold">LOGO</div>
                <div className="text-xs text-white opacity-80">{data.companyName}</div>
              </div>
            )}

            <div className="text-2xl font-bold mb-2">{data.companyName}</div>
            <div className="text-white text-opacity-90 whitespace-pre-line">
              {data.companyAddress}
            </div>

            <div className="mt-4 space-y-1 text-white text-opacity-90">
              {data.companyPhone && <div>Tel: {data.companyPhone}</div>}
              {data.companyEmail && <div>E-Mail: {data.companyEmail}</div>}
              {data.companyWebsite && <div>Web: {data.companyWebsite}</div>}
            </div>
          </div>

          <div className="text-right text-white min-w-[200px] ml-8">
            <h1 className="text-4xl font-bold mb-6">RECHNUNG</h1>
            <div className="bg-white bg-opacity-20 p-4 rounded">
              <div className="mb-2">
                <div className="text-xs opacity-80">Rechnungsnummer</div>
                <div className="font-bold text-lg">{data.invoiceNumber}</div>
              </div>
              <div className="mb-2">
                <div className="text-xs opacity-80">Datum</div>
                <div className="font-semibold">{data.issueDate}</div>
              </div>
              <div>
                <div className="text-xs opacity-80">Fällig am</div>
                <div className="font-semibold">{data.dueDate}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Steuerliche Pflichtangaben */}
      <div className="px-8 mb-6">
        <div className="bg-gray-50 p-4 rounded border-l-4 border-[#14ad9f]">
          <div className="text-xs text-gray-600 space-y-1">
            {data.companyTaxNumber && (
              <div>
                <strong>Steuernummer:</strong> {data.companyTaxNumber}
              </div>
            )}
            {data.companyVatId && (
              <div>
                <strong>USt-IdNr.:</strong> {data.companyVatId}
              </div>
            )}
            <div>
              <strong>Fortlaufende Nummer:</strong>{' '}
              {data.sequentialNumber?.toString().padStart(6, '0')}
            </div>
            {data.companyRegister && (
              <div>
                <strong>Handelsregister:</strong> {data.companyRegister}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rechnungsempfänger */}
      <div className="px-8 mb-8">
        <div className="text-sm font-semibold text-gray-900 mb-3">Rechnungsempfänger</div>
        <div className="bg-white border border-gray-200 p-6 rounded shadow-sm">
          <div className="font-bold text-gray-900 text-lg mb-1">{data.customerName}</div>
          <div className="text-gray-700 whitespace-pre-line">{data.customerAddress}</div>
          {data.customerEmail && (
            <div className="text-gray-600 mt-2">E-Mail: {data.customerEmail}</div>
          )}
        </div>
      </div>

      {/* Rechnungspositionen */}
      <div className="px-8 mb-8">
        <div className="text-lg font-semibold text-gray-900 mb-4">Leistungen</div>
        <div className="overflow-hidden rounded border border-gray-200 shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-[#14ad9f] to-[#0f9d84] text-white">
                <th className="p-4 text-left font-semibold">Beschreibung</th>
                <th className="p-4 text-center font-semibold w-20">Menge</th>
                <th className="p-4 text-right font-semibold w-24">Einzelpreis</th>
                <th className="p-4 text-center font-semibold w-16">MwSt.</th>
                <th className="p-4 text-right font-semibold w-28">Gesamtpreis</th>
              </tr>
            </thead>
            <tbody>
              {data.items?.map((item, index) => (
                <tr
                  key={index}
                  className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} border-b border-gray-100`}
                >
                  <td className="p-4">{item.description}</td>
                  <td className="p-4 text-center">{item.quantity}</td>
                  <td className="p-4 text-right">{item.unitPrice?.toFixed(2)} €</td>
                  <td className="p-4 text-center">
                    {data.isSmallBusiness ? '-' : `${item.taxRate || 19}%`}
                  </td>
                  <td className="p-4 text-right font-semibold">{item.total?.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summenbereich */}
      <div className="px-8 mb-8">
        <div className="flex justify-end">
          <div className="w-80">
            <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
              <div className="bg-gray-50 p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Rechnungssumme</h3>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Nettobetrag:</span>
                  <span className="font-semibold">{data.amount?.toFixed(2)} €</span>
                </div>

                {data.isSmallBusiness ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Kleinunternehmerregelung §19 UStG:</span>
                    <span className="text-gray-600">keine MwSt.</span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mehrwertsteuer ({data.vatRate || 19}%):</span>
                    <span className="font-semibold">{data.tax?.toFixed(2)} €</span>
                  </div>
                )}

                <div className="border-t pt-3">
                  <div className="flex justify-between items-center bg-gradient-to-r from-[#14ad9f] to-[#0f9d84] text-white p-3 rounded">
                    <span className="font-bold text-lg">Gesamtbetrag:</span>
                    <span className="font-bold text-xl">{data.total?.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Zahlungsbedingungen und Bankverbindung */}
      <div className="px-8 mb-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Zahlungsbedingungen */}
          {data.paymentTerms && (
            <div>
              <div className="text-sm font-semibold text-gray-900 mb-2">Zahlungsbedingungen</div>
              <div className="text-gray-700 text-sm">{data.paymentTerms}</div>
            </div>
          )}

          {/* Bankverbindung */}
          {data.bankDetails && (
            <div>
              <div className="text-sm font-semibold text-gray-900 mb-2">Bankverbindung</div>
              <div className="text-gray-700 text-sm space-y-1">
                {data.bankDetails.iban && (
                  <div>
                    <strong>IBAN:</strong> {data.bankDetails.iban}
                  </div>
                )}
                {data.bankDetails.bic && (
                  <div>
                    <strong>BIC:</strong> {data.bankDetails.bic}
                  </div>
                )}
                {data.bankDetails.accountHolder && (
                  <div>
                    <strong>Kontoinhaber:</strong> {data.bankDetails.accountHolder}
                  </div>
                )}
                {data.bankDetails.bankName && (
                  <div>
                    <strong>Bank:</strong> {data.bankDetails.bankName}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Steuerhinweise */}
      {(data.isSmallBusiness ||
        data.taxNote === 'kleinunternehmer' ||
        data.taxNote === 'reverse-charge') && (
        <div className="px-8 mb-6">
          <div className="bg-amber-50 border border-amber-200 rounded p-4">
            <div className="text-sm text-amber-800">
              <strong>Steuerhinweis:</strong>{' '}
              {data.isSmallBusiness || data.taxNote === 'kleinunternehmer'
                ? 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.'
                : data.taxNote === 'reverse-charge'
                  ? 'Nach dem Reverse-Charge-Prinzip §13b Abs.2 UStG schulden Sie als Leistungsempfänger die Umsatzsteuer als Unternehmer.'
                  : 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.'}
            </div>
          </div>
        </div>
      )}

      {/* Bemerkungen */}
      {data.notes && (
        <div className="px-8 mb-6">
          <div className="text-sm font-semibold text-gray-900 mb-2">Bemerkungen</div>
          <div className="text-gray-700 text-sm whitespace-pre-line bg-gray-50 p-4 rounded border">
            {data.notes}
          </div>
        </div>
      )}

      {/* Spacer um Footer nach unten zu drücken */}
      <div className="flex-grow"></div>

      {/* Professioneller Footer wie im PDF-Beispiel */}
      <div className="mt-8 border-t-4 border-[#14ad9f] bg-gradient-to-b from-white to-gray-50">
        <div className="px-8 py-8">
          {/* Drei-Spalten-Layout für Footer-Informationen */}
          <div className="grid grid-cols-3 gap-8 mb-6">
            {/* Kontakt-Säule */}
            <div>
              <h4 className="font-bold text-[#14ad9f] text-sm mb-3 uppercase tracking-wide">
                Kontakt
              </h4>
              <div className="text-xs text-gray-700 space-y-1">
                <div>{data.companyName}</div>
                <div className="whitespace-pre-line">{data.companyAddress}</div>
                {data.companyPhone && <div>Tel: {data.companyPhone}</div>}
                {data.companyEmail && <div>E-Mail: {data.companyEmail}</div>}
                {data.companyWebsite && <div>Web: {data.companyWebsite}</div>}
              </div>
            </div>

            {/* Rechtliches */}
            <div>
              <h4 className="font-bold text-[#14ad9f] text-sm mb-3 uppercase tracking-wide">
                Rechtliches
              </h4>
              <div className="text-xs text-gray-700 space-y-1">
                {data.companyTaxNumber && <div>Steuernummer: {data.companyTaxNumber}</div>}
                {data.companyVatId && <div>USt-IdNr.: {data.companyVatId}</div>}
                {data.companyRegister && <div>HRB: {data.companyRegister}</div>}
                {data.districtCourt && <div>AG: {data.districtCourt}</div>}
              </div>
            </div>

            {/* Banking */}
            <div>
              <h4 className="font-bold text-[#14ad9f] text-sm mb-3 uppercase tracking-wide">
                Banking
              </h4>
              <div className="text-xs text-gray-700 space-y-1">
                {data.bankDetails?.bankName && <div>Bank: {data.bankDetails.bankName}</div>}
                {data.bankDetails?.iban && <div>IBAN: {data.bankDetails.iban}</div>}
                {data.bankDetails?.bic && <div>BIC: {data.bankDetails.bic}</div>}
                {data.bankDetails?.accountHolder && (
                  <div>Inhaber: {data.bankDetails.accountHolder}</div>
                )}
              </div>
            </div>
          </div>

          {/* Trennlinie */}
          <div className="border-t border-gray-300 pt-4">
            {/* Compliance-Hinweis */}
            <div className="text-center text-xs text-gray-600 mb-3">
              Diese Rechnung entspricht den Anforderungen des UStG §14 und ist GoBD-konform
              archiviert.
              <br />
              Aufbewahrungspflicht: 10 Jahre gemäß §147 AO
            </div>

            {/* Taskilo Branding */}
            <div className="text-center border-t border-gray-200 pt-3">
              <div className="flex justify-center items-center space-x-3">
                <div className="h-0.5 w-12 bg-gradient-to-r from-transparent to-[#14ad9f]"></div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-[#14ad9f] rounded-full animate-pulse"></div>
                  <span className="text-[#14ad9f] font-bold text-sm tracking-wide">TASKILO</span>
                  <span className="text-gray-500 text-xs">Professional Business Solutions</span>
                  <div className="w-2 h-2 bg-[#14ad9f] rounded-full animate-pulse"></div>
                </div>
                <div className="h-0.5 w-12 bg-gradient-to-l from-transparent to-[#14ad9f]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
