import React from 'react';
import type { CompanySettings, TemplateCustomizations } from '../types';
import { resolveLogoUrl } from '../utils/logoUtils';

interface TemplateProps {
  data: InvoiceData;
  companySettings?: CompanySettings;
  customizations?: TemplateCustomizations;
}

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
}

/**
 * Corporate Classic Template - Zweispaltig mit klassischem Business-Layout
 */
export const CorporateClassicTemplate: React.FC<TemplateProps> = ({
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
    <div className="w-full max-w-4xl mx-auto bg-white font-serif text-sm">
      {/* Header mit klassischem Zweispalten-Layout */}
      <div className="border-b border-gray-200 p-8">
        <div className="grid grid-cols-2 gap-8">
          {/* Links: Company Info */}
          <div>
            {showLogo && logoUrl && (
              <img
                src={logoUrl}
                alt={`${data.company.name} Logo`}
                className="h-12 w-auto mb-3 object-contain"
              />
            )}
            <h1 className="text-3xl font-bold text-gray-900 mb-2 uppercase tracking-wider">
              {data.company.name}
            </h1>
            <div className="text-gray-700 space-y-1">
              <p>{data.company.address.street}</p>
              <p>
                {data.company.address.zipCode} {data.company.address.city}
              </p>
              <p className="mt-2 font-medium">{data.company.phone}</p>
              <p>{data.company.email}</p>
            </div>
          </div>

          {/* Rechts: Invoice Title */}
          <div className="text-right">
            <div className="border border-gray-300 p-6 bg-white">
              <h2 className="text-4xl font-bold text-gray-900 mb-2">Rechnung</h2>
              <div className="text-xl font-semibold text-gray-700">
                Rechnungsnummer {data.documentNumber}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Klassisches Kunden-Layout */}
        <div className="grid grid-cols-3 gap-8 mb-8">
          <div className="col-span-2">
            <div className="border-l-4 border-gray-900 pl-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">
                Rechnungsempfänger
              </h3>
              <div className="text-lg font-medium space-y-1">
                <p className="font-bold text-gray-900">{data.customer.name}</p>
                <p className="text-gray-700">{data.customer.address.street}</p>
                <p className="text-gray-700">
                  {data.customer.address.zipCode} {data.customer.address.city}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 p-4 border border-gray-300">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Rechnungsdatum
              </h4>
              <p className="text-lg font-semibold text-gray-900">{formatDate(data.date)}</p>
            </div>
            <div className="bg-white p-4 border border-gray-300">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Fälligkeitsdatum
              </h4>
              <p className="text-lg font-semibold text-gray-900">{formatDate(data.dueDate)}</p>
            </div>
            <div className="bg-gray-50 p-4 border border-gray-300">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Leistungsdatum / -zeitraum
              </h4>
              <p className="text-lg font-semibold text-gray-900">{serviceText}</p>
            </div>
          </div>
        </div>

        {/* Klassische Tabelle mit klaren Linien */}
        <div className="mb-8">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100 text-gray-800">
                <th className="border border-gray-300 p-3 text-left font-semibold tracking-wider">
                  Position
                </th>
                <th className="border border-gray-300 p-3 text-left font-semibold tracking-wider">
                  Beschreibung
                </th>
                <th className="border border-gray-300 p-3 text-center font-semibold tracking-wider">
                  Menge
                </th>
                <th className="border border-gray-300 p-3 text-right font-semibold tracking-wider">
                  Einzelpreis
                </th>
                <th className="border border-gray-300 p-3 text-right font-semibold tracking-wider">
                  Gesamtpreis
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-200 p-3 text-center font-medium">
                    {index + 1}
                  </td>
                  <td className="border border-gray-200 p-3 text-gray-900">{item.description}</td>
                  <td className="border border-gray-200 p-3 text-center">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="border border-gray-200 p-3 text-right">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="border border-gray-200 p-3 text-right font-semibold">
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Klassische Summen-Darstellung */}
        <div className="flex justify-end">
          <div className="w-80">
            <div className="border border-gray-300 bg-white">
              <div className="border-b border-gray-200 p-3 flex justify-between">
                <span className="font-medium text-gray-700">Zwischensumme:</span>
                <span className="font-semibold">{formatCurrency(data.subtotal)}</span>
              </div>
              {!(data.isSmallBusiness || data.reverseCharge) && data.taxAmount > 0 && (
                <div className="border-b border-gray-200 p-3 flex justify-between">
                  <span className="font-medium text-gray-700">Umsatzsteuer ({data.taxRate}%):</span>
                  <span className="font-semibold">{formatCurrency(data.taxAmount)}</span>
                </div>
              )}
              <div className="p-4 flex justify-between bg-gray-50 border-t border-gray-200">
                <span className="text-lg font-bold">Gesamtbetrag:</span>
                <span className="text-xl font-bold">{formatCurrency(data.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer im klassischen Stil */}
        <div className="mt-12 pt-8 border-t-2 border-gray-900">
          <div className="grid grid-cols-3 gap-8 text-xs text-gray-600">
            <div>
              <h5 className="font-bold text-gray-900 mb-2 uppercase">Geschäftsführung</h5>
              <p>{data.paymentTerms}</p>
            </div>
            <div>
              <h5 className="font-bold text-gray-900 mb-2 uppercase">Bankverbindung</h5>
              <p>IBAN: {data.company.bankDetails.iban}</p>
              <p>BIC: {data.company.bankDetails.bic}</p>
            </div>
            <div>
              <h5 className="font-bold text-gray-900 mb-2 uppercase">Steuern</h5>
              {data.company.vatId && <p>USt-IdNr.: {data.company.vatId}</p>}
              {data.company.taxNumber && <p>Steuernr.: {data.company.taxNumber}</p>}
            </div>
          </div>
          <div className="mt-6 text-xs text-gray-700">
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

export default CorporateClassicTemplate;
