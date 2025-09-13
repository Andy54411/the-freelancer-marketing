import React from 'react';
import type { CompanySettings, TemplateCustomizations } from '../types';
import { resolveLogoUrl } from '../utils/logoUtils';

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
  companySettings?: CompanySettings;
  customizations?: TemplateCustomizations;
}

/**
 * Tech Startup Template - Modern, technisch, strukturiert
 */
export const TechStartupTemplate: React.FC<TemplateProps> = ({
  data,
  companySettings,
  customizations,
}) => {
  const logoUrl = resolveLogoUrl(customizations, companySettings, data);
  const showLogo = customizations?.showLogo ?? true;
  return (
    <div className="w-full max-w-4xl mx-auto bg-white font-mono text-sm">
      {/* Tech-Header mit Monospace */}
      <div className="bg-gray-900 text-white p-8">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center mb-4">
              <div className="w-3 h-3 bg-white rounded-full mr-2"></div>
              <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            </div>
            <h1 className="text-3xl font-bold mb-2">$ INVOICE.EXE</h1>
            <p className="text-gray-300">Document_ID: {data.documentNumber}</p>
          </div>

          <div className="text-right bg-gray-800 p-4 rounded border border-gray-700">
            {showLogo && logoUrl && (
              <img
                src={logoUrl}
                alt={`${data.company.name} Logo`}
                className="h-10 w-auto ml-auto mb-2 object-contain"
              />
            )}
            <pre className="text-xs text-gray-300 mb-2">
              {`
┌─────────────────────────┐
│      ${data.company.name.padEnd(15)}      │
└─────────────────────────┘
`}
            </pre>
            <div className="text-sm text-gray-300">
              <p>{data.company.address.street}</p>
              <p>
                {data.company.address.zipCode} {data.company.address.city}
              </p>
              <p className="mt-2 text-gray-400">[{data.company.phone}]</p>
              <p className="text-gray-400">[{data.company.email}]</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Tech Kunden-Sektion */}
        <div className="mb-8">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="border border-gray-300 p-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">
                  &gt; CLIENT_INFO
                </h3>
                <div className="font-mono text-sm space-y-1">
                  <p className="text-gray-800 font-bold">{data.customer.name}</p>
                  <p className="text-gray-600">{data.customer.address.street}</p>
                  <p className="text-gray-600">
                    {data.customer.address.zipCode} {data.customer.address.city}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-100 border border-gray-300 p-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
                  &gt; DATE_CREATED
                </h4>
                <p className="font-mono text-lg font-bold text-gray-800">{data.date}</p>
              </div>
              <div className="bg-gray-50 border border-gray-300 p-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">&gt; DUE_DATE</h4>
                <p className="font-mono text-lg font-bold text-gray-800">{data.dueDate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tech Artikel-Tabelle */}
        <div className="mb-8">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-4 tracking-wider">
            &gt; ITEMS_ARRAY [ ]
          </h3>

          <div className="border border-gray-300">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="p-3 text-left font-bold">INDEX</th>
                  <th className="p-3 text-left font-bold">DESCRIPTION</th>
                  <th className="p-3 text-center font-bold">QTY</th>
                  <th className="p-3 text-right font-bold">PRICE_UNIT</th>
                  <th className="p-3 text-right font-bold">TOTAL_PRICE</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="p-3">
                      <span className="bg-gray-800 text-white px-2 py-1 rounded text-xs">
                        {String(index).padStart(2, '0')}
                      </span>
                    </td>
                    <td className="p-3 text-gray-800">{item.description}</td>
                    <td className="p-3 text-center">
                      <span className="bg-gray-100 px-2 py-1 rounded">
                        {item.quantity} {item.unit}
                      </span>
                    </td>
                    <td className="p-3 text-right text-gray-600">
                      EUR {item.unitPrice.toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-bold text-gray-800">
                      EUR {item.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tech Summen */}
        <div className="flex justify-end mb-8">
          <div className="w-80">
            <div className="border border-gray-300 bg-gray-50">
              <div className="bg-gray-800 text-white p-3 text-xs font-bold uppercase tracking-wider">
                &gt; CALCULATION_OUTPUT
              </div>
              <div className="p-4 font-mono space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">subtotal:</span>
                  <span className="text-gray-800">EUR {data.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">tax_rate:</span>
                  <span className="text-gray-800">{data.taxRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">tax_amount:</span>
                  <span className="text-gray-800">EUR {data.taxAmount.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-300 pt-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-gray-800">total_amount:</span>
                    <span className="text-gray-800">EUR {data.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tech Footer */}
        <div className="border-t border-gray-300 pt-6 font-mono text-xs">
          <div className="grid grid-cols-3 gap-8">
            <div>
              <h5 className="text-gray-500 uppercase mb-2 font-bold">&gt; PAYMENT_TERMS</h5>
              <p className="text-gray-700">{data.paymentTerms}</p>
            </div>
            <div>
              <h5 className="text-gray-500 uppercase mb-2 font-bold">&gt; BANK_DETAILS</h5>
              <p className="text-gray-700">IBAN: {data.company.bankDetails.iban}</p>
              <p className="text-gray-700">BIC: {data.company.bankDetails.bic}</p>
            </div>
            <div>
              <h5 className="text-gray-500 uppercase mb-2 font-bold">&gt; TAX_INFO</h5>
              <p className="text-gray-700">VAT_ID: {data.company.vatId}</p>
              <p className="text-gray-700">TAX_NO: {data.company.taxNumber}</p>
            </div>
          </div>

          {data.notes && (
            <div className="mt-6 p-4 bg-gray-100 border border-gray-300">
              <h5 className="text-gray-500 uppercase mb-2 font-bold">&gt; NOTES</h5>
              <p className="text-gray-700">{data.notes}</p>
            </div>
          )}

          <div className="mt-6 text-center text-gray-400">
            <p>Generated by Tasko Invoice System v2.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechStartupTemplate;
