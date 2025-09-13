import React from 'react';
import { TemplateProps } from '../types';

export const ProfessionalBusinessQuoteTemplate: React.FC<TemplateProps> = ({ 
  data, 
  companySettings,
  customizations 
}) => {
  const logoUrl = companySettings?.logoUrl || customizations?.logoUrl;

  return (
    <div className="max-w-4xl mx-auto bg-white font-sans">
      {/* Professional Header */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white p-8">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {logoUrl && (
              <img 
                src={logoUrl} 
                alt="Company Logo" 
                className="h-16 w-auto mb-4 bg-white p-2 rounded"
              />
            )}
            <h1 className="text-4xl font-bold mb-2">QUOTATION</h1>
            <p className="text-xl text-blue-200">Document #{data.documentNumber}</p>
          </div>
          <div className="text-right bg-white/10 p-4 rounded-lg backdrop-blur">
            <h2 className="font-bold text-xl mb-2">{companySettings?.companyName}</h2>
            <div className="text-blue-100 space-y-1">
              <p>{companySettings?.address?.street}</p>
              <p>{companySettings?.address?.zipCode} {companySettings?.address?.city}</p>
              <p className="mt-2">{companySettings?.contactInfo?.phone}</p>
              <p>{companySettings?.contactInfo?.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Client & Quote Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <div className="w-4 h-4 bg-blue-600 rounded-full mr-3"></div>
              CLIENT INFORMATION
            </h3>
            <div className="space-y-2">
              <p className="text-xl font-semibold text-gray-900">{data.customerName}</p>
              <p className="text-gray-600">{data.customerAddress?.street}</p>
              <p className="text-gray-600">{data.customerAddress?.zipCode} {data.customerAddress?.city}</p>
              {data.customerContact && (
                <p className="text-gray-600 mt-3 pt-3 border-t border-gray-300">
                  Contact: {data.customerContact}
                </p>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Quote Date</h4>
              <p className="text-xl font-bold text-blue-900">{data.date}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Valid Until</h4>
              <p className="text-xl font-bold text-green-900">{data.validUntil}</p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <div className="w-6 h-6 bg-blue-600 rounded mr-3 flex items-center justify-center">
              <span className="text-white text-sm">✓</span>
            </div>
            SERVICE BREAKDOWN
          </h3>
          
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-800 to-gray-900 text-white">
                <tr>
                  <th className="p-4 text-left font-semibold">#</th>
                  <th className="p-4 text-left font-semibold">Service Description</th>
                  <th className="p-4 text-center font-semibold">Qty</th>
                  <th className="p-4 text-right font-semibold">Unit Price</th>
                  <th className="p-4 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items?.map((item, index) => (
                  <tr key={index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b border-gray-200`}>
                    <td className="p-4 font-semibold text-blue-600">{String(index + 1).padStart(2, '0')}</td>
                    <td className="p-4">
                      <div className="font-semibold text-gray-900">{item.description}</div>
                      {item.details && (
                        <div className="text-sm text-gray-600 mt-1">{item.details}</div>
                      )}
                    </td>
                    <td className="p-4 text-center font-medium">{item.quantity}</td>
                    <td className="p-4 text-right font-medium">€{item.unitPrice?.toFixed(2)}</td>
                    <td className="p-4 text-right font-bold text-blue-900">
                      €{(item.quantity * item.unitPrice).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Professional Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-96 bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
            <div className="bg-gray-800 text-white p-4">
              <h4 className="font-bold text-lg">INVESTMENT SUMMARY</h4>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">€{data.subtotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">VAT ({data.taxRate}%):</span>
                <span className="font-semibold">€{data.taxAmount?.toFixed(2)}</span>
              </div>
              <div className="border-t-2 border-blue-600 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-800">Total Investment:</span>
                  <span className="text-2xl font-bold text-blue-900">€{data.total?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-200 pt-6">
          <div className="grid grid-cols-3 gap-8 text-sm text-gray-600">
            <div>
              <h5 className="font-semibold text-gray-800 mb-2">Business Details</h5>
              <p>{companySettings?.taxId}</p>
              <p>VAT: {companySettings?.vatId}</p>
            </div>
            <div>
              <h5 className="font-semibold text-gray-800 mb-2">Banking</h5>
              <p>IBAN: {companySettings?.bankDetails?.iban}</p>
              <p>BIC: {companySettings?.bankDetails?.bic}</p>
            </div>
            <div>
              <h5 className="font-semibold text-gray-800 mb-2">Contact</h5>
              <p>{companySettings?.contactInfo?.phone}</p>
              <p>{companySettings?.contactInfo?.email}</p>
            </div>
          </div>
          
          <div className="text-center mt-6 pt-6 border-t border-gray-200">
            <p className="text-lg font-semibold text-blue-800">
              Thank you for considering our professional services
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};