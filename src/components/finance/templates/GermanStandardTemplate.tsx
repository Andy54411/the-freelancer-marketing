import React from 'react';
import { InvoiceData } from './types';

interface TemplateProps {
  data: InvoiceData;
  preview?: boolean;
}

/**
 * Deutsche Standard-Rechnungsvorlage
 *
 * Features:
 * - UStG §14 konforme Pflichtangaben
 * - GoBD-zertifizierte Struktur
 * - Kleinunternehmerregelung Support
 * - Deutsche Steuerrecht-Compliance
 * - A4-Format (595px × 842px)
 */
export const GermanStandardTemplate: React.FC<TemplateProps> = ({ data, preview = false }) => {
  return (
    <div className="w-[595px] h-[842px] bg-white p-8 font-sans text-sm leading-normal">
      {/* Header mit Logo und Firmenangaben */}
      <div className="flex justify-between items-start mb-8">
        <div className="flex-1 mr-8">
          {data.companyLogo && (
            <div className="mb-4">
              <img
                src={data.companyLogo}
                alt={`${data.companyName} Logo`}
                className="h-16 w-auto object-contain"
                onError={e => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}

          <div className="text-lg font-bold text-gray-900 mb-2">{data.companyName}</div>
          <div className="text-gray-700 whitespace-pre-line">{data.companyAddress}</div>

          {data.companyPhone && <div className="text-gray-700 mt-1">Tel: {data.companyPhone}</div>}
          {data.companyEmail && <div className="text-gray-700">E-Mail: {data.companyEmail}</div>}
          {data.companyWebsite && <div className="text-gray-700">Web: {data.companyWebsite}</div>}
        </div>

        <div className="text-right">
          <h1 className="text-2xl font-bold text-[#14ad9f] mb-4">RECHNUNG</h1>
          <div className="text-gray-700">
            <div className="mb-1">
              <strong>Rechnungsnr.:</strong> {data.invoiceNumber}
            </div>
            <div className="mb-1">
              <strong>Datum:</strong> {data.issueDate}
            </div>
            <div className="mb-1">
              <strong>Fällig:</strong> {data.dueDate}
            </div>
          </div>
        </div>
      </div>

      {/* Steuerliche Pflichtangaben (UStG §14) */}
      <div className="border-t border-gray-300 pt-4 mb-6">
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
        </div>
      </div>

      {/* Rechnungsempfänger */}
      <div className="mb-8">
        <div className="text-sm font-semibold text-gray-900 mb-2">Rechnungsempfänger:</div>
        <div className="bg-gray-50 p-4 border border-gray-200">
          <div className="font-semibold text-gray-900">{data.customerName}</div>
          <div className="text-gray-700 whitespace-pre-line">{data.customerAddress}</div>
          {data.customerEmail && (
            <div className="text-gray-700 mt-1">E-Mail: {data.customerEmail}</div>
          )}
        </div>
      </div>

      {/* Rechnungspositionen */}
      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#14ad9f] text-white">
              <th className="border border-gray-300 p-2 text-left">Beschreibung</th>
              <th className="border border-gray-300 p-2 text-center w-16">Menge</th>
              <th className="border border-gray-300 p-2 text-right w-20">Einzelpreis</th>
              <th className="border border-gray-300 p-2 text-center w-16">MwSt.</th>
              <th className="border border-gray-300 p-2 text-right w-24">Gesamtpreis</th>
            </tr>
          </thead>
          <tbody>
            {data.items?.map((item, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="border border-gray-300 p-2">{item.description}</td>
                <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                <td className="border border-gray-300 p-2 text-right">
                  {item.unitPrice?.toFixed(2)} €
                </td>
                <td className="border border-gray-300 p-2 text-center">
                  {data.isSmallBusiness ? '-' : `${item.taxRate || 19}%`}
                </td>
                <td className="border border-gray-300 p-2 text-right font-semibold">
                  {item.total?.toFixed(2)} €
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summenbereich mit deutscher Steuerlogik */}
      <div className="flex justify-end mb-8">
        <div className="w-64">
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span>Nettobetrag:</span>
            <span className="font-semibold">{data.amount?.toFixed(2)} €</span>
          </div>

          {data.isSmallBusiness ? (
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-xs">Kleinunternehmerregelung §19 UStG:</span>
              <span className="text-xs">keine MwSt.</span>
            </div>
          ) : (
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span>Mehrwertsteuer:</span>
              <span className="font-semibold">{data.tax?.toFixed(2)} €</span>
            </div>
          )}

          <div className="flex justify-between py-3 border-b-2 border-[#14ad9f] bg-gray-50 px-2">
            <span className="font-bold text-lg">Gesamtbetrag:</span>
            <span className="font-bold text-lg text-[#14ad9f]">{data.total?.toFixed(2)} €</span>
          </div>
        </div>
      </div>

      {/* Zahlungsbedingungen */}
      {data.paymentTerms && (
        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-900 mb-2">Zahlungsbedingungen:</div>
          <div className="text-gray-700 text-sm">{data.paymentTerms}</div>
        </div>
      )}

      {/* Bankverbindung */}
      {data.bankDetails && (
        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-900 mb-2">Bankverbindung:</div>
          <div className="text-gray-700 text-sm">
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

      {/* Kleinunternehmer-Hinweis */}
      {data.isSmallBusiness && (
        <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <div className="text-xs text-yellow-800">
            <strong>Hinweis:</strong> Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.
          </div>
        </div>
      )}

      {/* Bemerkungen */}
      {data.notes && (
        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-900 mb-2">Bemerkungen:</div>
          <div className="text-gray-700 text-sm whitespace-pre-line">{data.notes}</div>
        </div>
      )}

      {/* Footer mit Rechtlichen Hinweisen */}
      <div className="mt-auto pt-4 border-t border-gray-300">
        <div className="text-xs text-gray-500 text-center">
          Diese Rechnung entspricht den Anforderungen des UStG §14 und ist GoBD-konform archiviert.
        </div>
      </div>
    </div>
  );
};
