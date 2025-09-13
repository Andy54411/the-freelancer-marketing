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
  return (
    <div className="w-full max-w-4xl mx-auto bg-white font-serif text-sm">
      {/* Header mit klassischem Zweispalten-Layout */}
      <div className="border-b-4 border-gray-900 p-8">
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
            <div className="border-4 border-gray-900 p-6 bg-gray-50">
              <h2 className="text-4xl font-bold text-gray-900 mb-2 uppercase tracking-widest">
                RECHNUNG
              </h2>
              <div className="text-xl font-semibold text-gray-700">Nr. {data.documentNumber}</div>
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
            <div className="bg-gray-100 p-4 border border-gray-300">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Rechnungsdatum
              </h4>
              <p className="text-lg font-semibold text-gray-900">{data.date}</p>
            </div>
            <div className="bg-gray-50 p-4 border border-gray-300">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Fälligkeitsdatum
              </h4>
              <p className="text-lg font-semibold text-gray-900">{data.dueDate}</p>
            </div>
          </div>
        </div>

        {/* Klassische Tabelle mit klaren Linien */}
        <div className="mb-8">
          <table className="w-full border-collapse border-2 border-gray-900">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="border border-gray-900 p-3 text-left font-bold uppercase tracking-wider">
                  Position
                </th>
                <th className="border border-gray-900 p-3 text-left font-bold uppercase tracking-wider">
                  Beschreibung
                </th>
                <th className="border border-gray-900 p-3 text-center font-bold uppercase tracking-wider">
                  Menge
                </th>
                <th className="border border-gray-900 p-3 text-right font-bold uppercase tracking-wider">
                  Einzelpreis
                </th>
                <th className="border border-gray-900 p-3 text-right font-bold uppercase tracking-wider">
                  Gesamtpreis
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-400 p-3 text-center font-semibold">
                    {index + 1}
                  </td>
                  <td className="border border-gray-400 p-3 text-gray-900">{item.description}</td>
                  <td className="border border-gray-400 p-3 text-center">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="border border-gray-400 p-3 text-right">
                    €{item.unitPrice.toFixed(2)}
                  </td>
                  <td className="border border-gray-400 p-3 text-right font-semibold">
                    €{item.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Klassische Summen-Darstellung */}
        <div className="flex justify-end">
          <div className="w-80">
            <div className="border-2 border-gray-900 bg-gray-50">
              <div className="border-b border-gray-400 p-3 flex justify-between">
                <span className="font-medium text-gray-700">Zwischensumme:</span>
                <span className="font-semibold">€{data.subtotal.toFixed(2)}</span>
              </div>
              <div className="border-b border-gray-400 p-3 flex justify-between">
                <span className="font-medium text-gray-700">MwSt. ({data.taxRate}%):</span>
                <span className="font-semibold">€{data.taxAmount.toFixed(2)}</span>
              </div>
              <div className="bg-gray-900 text-white p-4 flex justify-between">
                <span className="text-lg font-bold uppercase tracking-wider">Gesamtbetrag:</span>
                <span className="text-xl font-bold">€{data.total.toFixed(2)}</span>
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
              <p>USt-IdNr.: {data.company.vatId}</p>
              <p>Steuernr.: {data.company.taxNumber}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorporateClassicTemplate;
