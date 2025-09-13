import React from 'react';
import type { CompanySettings, TemplateCustomizations } from '../types';
import { resolveLogoUrl } from '../utils/logoUtils';

interface InvoiceData {
  documentNumber: string;
  date: string;
  dueDate: string;
  serviceDate?: string;
  servicePeriod?: string;
  customer: {
    name: string;
    email: string;
    address: {
      street: string;
      zipCode: string;
      city: string;
      country: string;
    };
  };
  company: {
    name: string;
    email: string;
    phone: string;
    address: {
      street: string;
      zipCode: string;
      city: string;
      country: string;
    };
    taxNumber: string;
    vatId: string;
    bankDetails: {
      iban: string;
      bic: string;
      accountHolder: string;
    };
  };
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paymentTerms: string;
  notes: string;
  status: string;
  isSmallBusiness: boolean;
  reverseCharge?: boolean;
}

interface TemplateProps {
  data: InvoiceData;
  companySettings?: CompanySettings;
  customizations?: TemplateCustomizations;
}

// Creative Modern Template - Asymmetrisch, modern aber professionell
export const CreativeModernTemplate: React.FC<TemplateProps> = ({
  data,
  companySettings,
  customizations,
}) => {
  const logoUrl = resolveLogoUrl(customizations, companySettings, data);
  const showLogo = customizations?.showLogo ?? true;

  // DIN 5008: deutsches Datums- und Währungsformat
  const formatDate = (input: string) => {
    const d = new Date(input);
    return isNaN(d.getTime()) ? input : d.toLocaleDateString('de-DE');
  };
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  const serviceText =
    data.servicePeriod || (data.serviceDate ? formatDate(data.serviceDate) : formatDate(data.date));

  return (
    <div className="w-full max-w-4xl mx-auto bg-white font-sans text-sm">
      {/* Asymmetrischer Header */}
      <div className="relative">
        <div className="bg-gray-100 h-40 absolute top-0 right-0 w-2/3" />
        <div className="relative z-10 p-8">
          <div className="grid grid-cols-5 gap-8">
            <div className="col-span-2">
              <h1 className="text-4xl font-bold text-gray-800 mb-4">Rechnung</h1>
              <div className="w-16 h-1 bg-gray-800 mb-4" />
              <p className="text-lg text-gray-600">Rechnungsnummer {data.documentNumber}</p>
            </div>

            <div className="col-span-3 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              {showLogo && logoUrl && (
                <img
                  src={logoUrl}
                  alt={`${data.company.name} Logo`}
                  className="h-10 w-auto ml-auto mb-2 object-contain"
                />
              )}
              <h2 className="text-xl font-bold text-gray-800 mb-3">{data.company.name}</h2>
              <div className="text-gray-600 space-y-1">
                <p>{data.company.address.street}</p>
                <p>
                  {data.company.address.zipCode} {data.company.address.city}
                </p>
                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Telefon</p>
                    <p className="font-medium">{data.company.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase">E-Mail</p>
                    <p className="font-medium">{data.company.email}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8">
        {/* Moderne Kunden-Sektion */}
        <div className="my-10">
          <div className="grid grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                  Rechnung an
                </h3>
                <div className="space-y-2">
                  <p className="text-xl font-semibold text-gray-800">{data.customer.name}</p>
                  <p className="text-gray-600">{data.customer.address.street}</p>
                  <p className="text-gray-600">
                    {data.customer.address.zipCode} {data.customer.address.city}
                  </p>
                </div>
              </div>
            </div>

            <div className="col-span-2 space-y-4">
              <div className="flex justify-between">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Rechnungsdatum</p>
                  <p className="text-lg font-semibold text-gray-800">{formatDate(data.date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Fälligkeitsdatum</p>
                  <p className="text-lg font-semibold text-gray-800">{formatDate(data.dueDate)}</p>
                </div>
              </div>

              <div className="bg-gray-50 text-gray-900 p-4 rounded-lg border border-gray-200">
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  Zahlungsbedingungen
                </p>
                <p className="font-semibold">{data.paymentTerms}</p>
              </div>
              <div className="bg-white border border-gray-200 p-4 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Leistungsdatum / -zeitraum
                </p>
                <p className="font-semibold text-gray-800">{serviceText}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Moderne Artikel-Tabelle */}
        <div className="mb-10">
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    #
                  </th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Beschreibung
                  </th>
                  <th className="p-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Anzahl
                  </th>
                  <th className="p-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Einzelpreis
                  </th>
                  <th className="p-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Gesamt
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {data.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100 last:border-b-0">
                    <td className="p-4">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-semibold text-gray-600">
                        {index + 1}
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-gray-800">{item.description}</p>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-block bg-gray-100 px-3 py-1 rounded-full text-sm">
                        {item.quantity} {item.unit}
                      </span>
                    </td>
                    <td className="p-4 text-right text-gray-600">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="p-4 text-right font-semibold text-gray-800">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Moderne Summen */}
        <div className="flex justify-end mb-10">
          <div className="w-80">
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Zwischensumme</span>
                <span className="font-semibold text-gray-800">{formatCurrency(data.subtotal)}</span>
              </div>
              {!(data.isSmallBusiness || data.reverseCharge) && data.taxAmount > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Umsatzsteuer ({data.taxRate}%)</span>
                  <span className="font-semibold text-gray-800">
                    {formatCurrency(data.taxAmount)}
                  </span>
                </div>
              )}
              <div className="bg-gray-50 text-gray-900 p-4 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Gesamtbetrag</span>
                  <span className="text-2xl font-bold">{formatCurrency(data.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Moderner Footer */}
        <div className="border-t border-gray-200 pt-8 pb-8">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Bankverbindung
                </h5>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>IBAN: {data.company.bankDetails.iban}</p>
                  <p>BIC: {data.company.bankDetails.bic}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Steuerdaten
                </h5>
                <div className="text-sm text-gray-600 space-y-1">
                  {data.company.vatId && <p>USt-IdNr.: {data.company.vatId}</p>}
                  {data.company.taxNumber && <p>Steuernr.: {data.company.taxNumber}</p>}
                </div>
              </div>
            </div>
          </div>

          {data.notes && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border-l-4 border-gray-300">
              <p className="text-gray-700">{data.notes}</p>
            </div>
          )}

          <div className="mt-6 text-xs text-gray-600">
            {data.isSmallBusiness && (
              <p>Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).</p>
            )}
            {!data.isSmallBusiness && data.reverseCharge && (
              <p>Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG).</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreativeModernTemplate;
