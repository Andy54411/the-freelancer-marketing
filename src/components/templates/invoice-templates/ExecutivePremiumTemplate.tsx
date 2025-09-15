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

/**
 * Executive Premium Template - Exklusives Design mit grauen Akzenten
 */
export const ExecutivePremiumTemplate: React.FC<TemplateProps> = ({
  data,
  companySettings,
  customizations,
}) => {
  const logoUrl = resolveLogoUrl(customizations, companySettings, data);
  const showLogo = customizations?.showLogo ?? true;
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
      {/* Premium Header mit Seitlichem Layout */}
      <div className="relative">
        {/* Dezente Kopfzeile ohne farbigen Seitenbalken */}
        <div className="pl-8 pr-8 py-8 border-b border-gray-200 bg-white">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="mb-6">
                <h1 className="text-5xl font-light text-gray-900 mb-2">Rechnung</h1>
                <div className="w-20 h-px bg-gray-300"></div>
              </div>

              <div className="text-gray-600">
                <p className="text-lg font-medium">Rechnungsnummer {data.documentNumber}</p>
                <p>Erstellt am {formatDate(data.date)}</p>
              </div>
            </div>

            <div className="text-right bg-gray-50 p-6 rounded-lg border border-gray-200">
              {showLogo && logoUrl && (
                <img
                  src={logoUrl}
                  alt={`${data.company?.name || 'Company'} Logo`}
                  className="h-10 w-auto ml-auto mb-2 object-contain"
                />
              )}
              <h2 className="text-2xl font-bold text-gray-800 mb-3">{data.company?.name || 'Company Name'}</h2>
              <div className="text-gray-600 space-y-1">
                <p>{data.company?.address?.street}</p>
                <p>
                  {data.company?.address?.zipCode} {data.company?.address?.city}
                </p>
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <p className="font-medium">{data.company?.phone}</p>
                  <p>{data.company?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8">
        {/* Executive Kunden-Sektion */}
        <div className="my-12">
          <div className="grid grid-cols-2 gap-12">
            <div>
              <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">
                  Rechnungsadresse
                </h3>
                <div className="bg-white border border-gray-200 pl-6 py-4">
                  <p className="text-xl font-semibold text-gray-800 mb-2">{data.customer?.name || 'Customer Name'}</p>
                  <p className="text-gray-600">{data.customer?.address?.street}</p>
                  <p className="text-gray-600">
                    {data.customer?.address?.zipCode} {data.customer?.address?.city}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-100 text-gray-900 p-4 rounded border border-gray-200">
                <h4 className="text-xs font-bold uppercase tracking-widest mb-2">
                  Fälligkeitsdatum
                </h4>
                <p className="text-xl font-bold">{formatDate(data.dueDate)}</p>
              </div>
              <div className="bg-gray-100 border border-gray-300 p-4 rounded">
                <h4 className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">
                  Zahlungsbedingungen
                </h4>
                <p className="text-gray-800 font-medium">{data.paymentTerms}</p>
              </div>
              <div className="bg-white border border-gray-300 p-4 rounded">
                <h4 className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">
                  Leistungsdatum / -zeitraum
                </h4>
                <p className="text-gray-800 font-medium">{serviceText}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Artikel-Tabelle */}
        <div className="mb-12">
          <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
            <div className="bg-gray-100 text-gray-900 p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold tracking-wider">Leistungsübersicht</h3>
            </div>

            <table className="w-full">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-4 text-left font-semibold text-gray-700">#</th>
                  <th className="p-4 text-left font-semibold text-gray-700">
                    Leistungsbeschreibung
                  </th>
                  <th className="p-4 text-center font-semibold text-gray-700">Menge</th>
                  <th className="p-4 text-right font-semibold text-gray-700">Einzelpreis</th>
                  <th className="p-4 text-right font-semibold text-gray-700">Gesamtpreis</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="p-4 font-medium text-gray-600">
                      {String(index + 1).padStart(2, '0')}
                    </td>
                    <td className="p-4 font-medium text-gray-800">{item.description}</td>
                    <td className="p-4 text-center text-gray-600">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="p-4 text-right text-gray-600">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="p-4 text-right font-bold text-gray-800">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Premium Summen-Bereich */}
        <div className="flex justify-end mb-12">
          <div className="w-96">
            <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
              <div className="p-6 space-y-4">
                <div className="flex justify-between text-lg">
                  <span className="text-gray-600">Zwischensumme</span>
                  <span className="font-semibold text-gray-800">
                    {formatCurrency(data.subtotal)}
                  </span>
                </div>
                {!(data.isSmallBusiness || data.reverseCharge) && (
                  <div className="flex justify-between text-lg">
                    <span className="text-gray-600">Mehrwertsteuer ({data.taxRate}%)</span>
                    <span className="font-semibold text-gray-800">
                      {formatCurrency(data.taxAmount)}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold">Gesamtbetrag</span>
                  <span className="text-3xl font-bold">{formatCurrency(data.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Executive Footer */}
        <div className="border-t border-gray-200 pt-8 pb-8">
          <div className="grid grid-cols-3 gap-8 text-xs text-gray-500">
            <div>
              <h5 className="font-bold text-gray-700 mb-3 uppercase tracking-wider">Kontakt</h5>
              <p>Tel: {data.company.phone}</p>
              <p>Mail: {data.company.email}</p>
            </div>
            <div>
              <h5 className="font-bold text-gray-700 mb-3 uppercase tracking-wider">Banking</h5>
              <p>IBAN: {data.company.bankDetails.iban}</p>
              <p>BIC: {data.company.bankDetails.bic}</p>
            </div>
            <div>
              <h5 className="font-bold text-gray-700 mb-3 uppercase tracking-wider">Steuern</h5>
              {data.company.vatId && <p>USt-IdNr.: {data.company.vatId}</p>}
              {data.company.taxNumber && <p>Steuernr.: {data.company.taxNumber}</p>}
            </div>
          </div>

          {data.notes && (
            <div className="mt-8 p-4 bg-gray-50 rounded border-l-4 border-gray-800">
              <p className="text-gray-700 italic">{data.notes}</p>
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

export default ExecutivePremiumTemplate;
