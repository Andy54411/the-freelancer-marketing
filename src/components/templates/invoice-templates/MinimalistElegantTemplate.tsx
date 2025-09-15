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
 * Minimalist Elegant Template - Reduziert, clean, viel Weißraum
 */
export const MinimalistElegantTemplate: React.FC<TemplateProps> = ({
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
    <div className="w-full max-w-4xl mx-auto bg-white p-12 font-light text-sm">
      {/* Minimalistischer Header */}
      <div className="text-center mb-16">
        {showLogo && logoUrl && (
          <img
            src={logoUrl}
            alt={`${data.company?.name || 'Company'} Logo`}
            className="h-12 w-auto mx-auto mb-4 object-contain"
          />
        )}
        <h1 className="text-6xl font-thin text-gray-800 mb-8">Rechnung</h1>
        <div className="w-24 h-px bg-gray-400 mx-auto mb-8"></div>
        <p className="text-lg text-gray-500">Rechnungsnummer {data.documentNumber}</p>
      </div>

      {/* Company & Customer in minimalistischem Layout */}
      <div className="grid grid-cols-2 gap-16 mb-16">
        <div className="text-right">
          <h2 className="text-lg font-light text-gray-800 mb-6">{data.company?.name || 'Company Name'}</h2>
          <div className="text-gray-500 space-y-1 leading-relaxed">
            <p>{data.company?.address?.street}</p>
            <p>
              {data.company?.address?.zipCode} {data.company?.address?.city}
            </p>
            <p className="mt-4">{data.company?.phone}</p>
            <p>{data.company.email}</p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-light text-gray-800 mb-6">Rechnungsempfänger</h3>
          <div className="text-gray-700 space-y-1 leading-relaxed">
            <p className="font-medium">{data.customer?.name || 'Customer Name'}</p>
            <p>{data.customer?.address?.street}</p>
            <p>
              {data.customer?.address?.zipCode} {data.customer?.address?.city}
            </p>
          </div>
        </div>
      </div>

      {/* Datumsangaben & Leistungszeitraum */}
      <div className="flex justify-center mb-16">
        <div className="text-center space-y-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Rechnungsdatum</p>
            <p className="text-lg font-light text-gray-800">{formatDate(data.date)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Fälligkeitsdatum</p>
            <p className="text-lg font-light text-gray-800">{formatDate(data.dueDate)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">
              Leistungsdatum / -zeitraum
            </p>
            <p className="text-lg font-light text-gray-800">{serviceText}</p>
          </div>
        </div>
      </div>

      {/* Minimalistische Tabelle */}
      <div className="mb-16">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left pb-4 text-xs uppercase tracking-widest text-gray-400 font-normal">
                Beschreibung
              </th>
              <th className="text-center pb-4 text-xs uppercase tracking-widest text-gray-400 font-normal">
                Menge
              </th>
              <th className="text-right pb-4 text-xs uppercase tracking-widest text-gray-400 font-normal">
                Einzelpreis
              </th>
              <th className="text-right pb-4 text-xs uppercase tracking-widest text-gray-400 font-normal">
                Gesamtpreis
              </th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index} className="border-b border-gray-100">
                <td className="py-6 text-gray-800 font-light">{item.description}</td>
                <td className="py-6 text-center text-gray-600">
                  {item.quantity} {item.unit}
                </td>
                <td className="py-6 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                <td className="py-6 text-right font-medium text-gray-800">
                  {formatCurrency(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Minimalistisch-elegante Summen */}
      <div className="flex justify-end mb-16">
        <div className="w-72 space-y-4">
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Zwischensumme</span>
            <span className="text-gray-800">{formatCurrency(data.subtotal)}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Mehrwertsteuer ({data.taxRate}%)</span>
            <span className="text-gray-800">{formatCurrency(data.taxAmount)}</span>
          </div>
          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between py-2">
              <span className="text-lg font-light text-gray-800">Gesamtbetrag</span>
              <span className="text-xl font-medium text-gray-800">
                {formatCurrency(data.total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Minimalistischer Footer */}
      <div className="border-t border-gray-100 pt-12">
        <div className="grid grid-cols-3 gap-12 text-xs text-gray-400">
          <div className="text-center">
            <p className="uppercase tracking-widest mb-2">Zahlungsbedingungen</p>
            <p className="text-gray-600">{data.paymentTerms}</p>
          </div>
          <div className="text-center">
            <p className="uppercase tracking-widest mb-2">Bankverbindung</p>
            <p className="text-gray-600">IBAN: {data.company.bankDetails.iban}</p>
          </div>
          <div className="text-center">
            <p className="uppercase tracking-widest mb-2">Steuerdaten</p>
            {data.company.vatId && <p className="text-gray-600">USt-IdNr.: {data.company.vatId}</p>}
          </div>
        </div>

        {data.notes && (
          <div className="text-center mt-12">
            <p className="text-gray-500 italic font-light">{data.notes}</p>
          </div>
        )}

        <div className="text-center mt-8 text-xs text-gray-500">
          {data.isSmallBusiness && (
            <p>Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).</p>
          )}
          {!data.isSmallBusiness && data.reverseCharge && (
            <p>Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG).</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MinimalistElegantTemplate;
