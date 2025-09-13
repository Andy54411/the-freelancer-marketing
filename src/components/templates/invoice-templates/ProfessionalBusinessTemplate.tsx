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
  return (
    <div className="w-full max-w-4xl mx-auto bg-white p-8 font-sans text-sm">
      {/* Header */}
      <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-gray-300">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">RECHNUNG</h1>
          <p className="text-lg text-gray-600">Nr. {data.documentNumber}</p>
        </div>
        <div className="text-right">
          {showLogo && logoUrl && (
            <img
              src={logoUrl}
              alt={`${data.company.name} Logo`}
              className="h-12 w-auto ml-auto mb-2 object-contain"
            />
          )}
          <h2 className="text-xl font-bold text-gray-800 mb-2">{data.company.name}</h2>
          <div className="text-gray-600">
            <p>{data.company.address.street}</p>
            <p>
              {data.company.address.zipCode} {data.company.address.city}
            </p>
            <p className="mt-2">{data.company.phone}</p>
            <p>{data.company.email}</p>
          </div>
        </div>
      </div>

      {/* Kunde und Daten */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Rechnungsempfänger</h3>
          <div className="bg-gray-50 p-4 rounded">
            <p className="font-bold text-gray-800">{data.customer.name}</p>
            <p className="text-gray-700">{data.customer.address.street}</p>
            <p className="text-gray-700">
              {data.customer.address.zipCode} {data.customer.address.city}
            </p>
          </div>
        </div>
        <div>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-bold text-gray-500 uppercase">Rechnungsdatum: </span>
              <span className="font-semibold">{data.date}</span>
            </div>
            <div>
              <span className="text-sm font-bold text-gray-500 uppercase">Fälligkeitsdatum: </span>
              <span className="font-semibold">{data.dueDate}</span>
            </div>
            <div>
              <span className="text-sm font-bold text-gray-500 uppercase">
                Zahlungsbedingungen:{' '}
              </span>
              <span className="font-semibold">{data.paymentTerms}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Artikel Tabelle */}
      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-3 text-left font-bold">Position</th>
              <th className="border border-gray-300 p-3 text-left font-bold">Beschreibung</th>
              <th className="border border-gray-300 p-3 text-center font-bold">Menge</th>
              <th className="border border-gray-300 p-3 text-right font-bold">Einzelpreis</th>
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
                  €{item.unitPrice.toFixed(2)}
                </td>
                <td className="border border-gray-300 p-3 text-right font-semibold">
                  €{item.total.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summen */}
      <div className="flex justify-end mb-8">
        <div className="w-80">
          <div className="space-y-2">
            <div className="flex justify-between py-2">
              <span>Zwischensumme:</span>
              <span>€{data.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span>MwSt. ({data.taxRate}%):</span>
              <span>€{data.taxAmount.toFixed(2)}</span>
            </div>
            <div className="border-t-2 border-gray-300 pt-2">
              <div className="flex justify-between py-2 text-lg font-bold">
                <span>Gesamtbetrag:</span>
                <span>€{data.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-gray-300 pt-6 text-xs text-gray-600">
        <div className="grid grid-cols-3 gap-8">
          <div>
            <h4 className="font-bold text-gray-700 mb-2">Bankverbindung</h4>
            <p>IBAN: {data.company.bankDetails.iban}</p>
            <p>BIC: {data.company.bankDetails.bic}</p>
          </div>
          <div>
            <h4 className="font-bold text-gray-700 mb-2">Steuerdaten</h4>
            <p>USt-IdNr.: {data.company.vatId}</p>
            <p>Steuernr.: {data.company.taxNumber}</p>
          </div>
          <div>
            <h4 className="font-bold text-gray-700 mb-2">Notizen</h4>
            <p>{data.notes}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalBusinessTemplate;
