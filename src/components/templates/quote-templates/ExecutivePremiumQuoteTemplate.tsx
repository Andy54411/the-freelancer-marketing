import React from 'react';
import { TemplateProps } from '../types';

export const ExecutivePremiumQuoteTemplate: React.FC<TemplateProps> = ({ 
  data, 
  companySettings,
  customizations 
}) => {
  const logoUrl = companySettings?.logoUrl || customizations?.logoUrl;

  return (
    <div className="max-w-4xl mx-auto bg-white font-serif">
      {/* Executive Header */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full transform translate-x-32 -translate-y-32"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {logoUrl && (
                <div className="bg-white p-3 rounded-lg inline-block mb-6">
                  <img 
                    src={logoUrl} 
                    alt="Company Logo" 
                    className="h-14 w-auto"
                  />
                </div>
              )}
              <h1 className="text-5xl font-light mb-3 tracking-wide">EXECUTIVE</h1>
              <h2 className="text-3xl font-bold text-yellow-400">QUOTATION</h2>
              <p className="text-xl text-gray-300 mt-2">Reference: {data.documentNumber}</p>
            </div>
            <div className="text-right bg-white/10 p-6 rounded-lg backdrop-blur">
              <h3 className="font-bold text-2xl mb-3 text-yellow-400">{companySettings?.companyName}</h3>
              <div className="text-gray-200 space-y-1 text-sm">
                <p>{companySettings?.address?.street}</p>
                <p>{companySettings?.address?.zipCode} {companySettings?.address?.city}</p>
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <p>{companySettings?.contactInfo?.phone}</p>
                  <p>{companySettings?.contactInfo?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Executive Summary */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-8 rounded-lg border-l-4 border-yellow-500">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Executive Summary</h3>
            <p className="text-gray-700 text-lg leading-relaxed">
              We are honored to present this premium proposal tailored specifically for your organization's 
              strategic objectives. This comprehensive quotation reflects our commitment to delivering 
              exceptional value through innovative solutions and unparalleled service excellence.
            </p>
          </div>
        </div>

        {/* Client Information & Quote Details */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="col-span-2 bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <div className="w-2 h-8 bg-yellow-500 rounded mr-4"></div>
              Distinguished Client
            </h3>
            <div className="space-y-3">
              <h4 className="text-2xl font-semibold text-gray-900">{data.customerName}</h4>
              <div className="text-gray-600 space-y-1">
                <p className="text-lg">{data.customerAddress?.street}</p>
                <p className="text-lg">{data.customerAddress?.zipCode} {data.customerAddress?.city}</p>
              </div>
              {data.customerContact && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <p className="text-gray-700 font-medium">Executive Contact: {data.customerContact}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 text-white p-4 rounded-lg">
              <h4 className="font-semibold text-yellow-400 mb-2">Proposal Date</h4>
              <p className="text-xl font-bold">{data.date}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-500 to-amber-600 text-white p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Valid Through</h4>
              <p className="text-xl font-bold">{data.validUntil}</p>
            </div>
          </div>
        </div>

        {/* Premium Services Table */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg mr-4 flex items-center justify-center">
              <span className="text-white text-lg">★</span>
            </div>
            Premium Service Portfolio
          </h3>
          
          <div className="overflow-hidden rounded-xl border-2 border-gray-200 shadow-lg">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-800 via-gray-900 to-black text-white">
                <tr>
                  <th className="p-5 text-left font-semibold">Item</th>
                  <th className="p-5 text-left font-semibold">Premium Service</th>
                  <th className="p-5 text-center font-semibold">Quantity</th>
                  <th className="p-5 text-right font-semibold">Unit Rate</th>
                  <th className="p-5 text-right font-semibold">Investment</th>
                </tr>
              </thead>
              <tbody>
                {data.items?.map((item, index) => (
                  <tr key={index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b border-gray-200`}>
                    <td className="p-5">
                      <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{index + 1}</span>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="font-semibold text-gray-900 text-lg">{item.description}</div>
                      {item.details && (
                        <div className="text-gray-600 mt-2 text-sm leading-relaxed">{item.details}</div>
                      )}
                    </td>
                    <td className="p-5 text-center">
                      <span className="bg-gray-800 text-white px-3 py-1 rounded-full font-medium">
                        {item.quantity}
                      </span>
                    </td>
                    <td className="p-5 text-right font-semibold text-lg">€{item.unitPrice?.toFixed(2)}</td>
                    <td className="p-5 text-right">
                      <span className="text-xl font-bold text-yellow-600">
                        €{(item.quantity * item.unitPrice).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Executive Investment Summary */}
        <div className="flex justify-end mb-8">
          <div className="w-96">
            <div className="bg-gradient-to-br from-gray-800 to-black text-white rounded-t-lg p-6">
              <h4 className="font-bold text-2xl text-yellow-400">Investment Summary</h4>
            </div>
            <div className="bg-white border-2 border-gray-800 rounded-b-lg p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-lg">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold">€{data.subtotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-lg">
                  <span className="text-gray-600">VAT ({data.taxRate}%):</span>
                  <span className="font-semibold">€{data.taxAmount?.toFixed(2)}</span>
                </div>
                <div className="border-t-2 border-yellow-500 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-gray-800">Total Investment:</span>
                    <span className="text-3xl font-bold text-yellow-600">€{data.total?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Distinguished Footer */}
        <div className="border-t-2 border-gray-800 pt-8">
          <div className="grid grid-cols-3 gap-8 text-sm text-gray-600 mb-6">
            <div>
              <h5 className="font-bold text-gray-800 mb-3">Corporate Details</h5>
              <p className="mb-1">Tax ID: {companySettings?.taxId}</p>
              <p>VAT: {companySettings?.vatId}</p>
            </div>
            <div>
              <h5 className="font-bold text-gray-800 mb-3">Banking Information</h5>
              <p className="mb-1">IBAN: {companySettings?.bankDetails?.iban}</p>
              <p>BIC: {companySettings?.bankDetails?.bic}</p>
            </div>
            <div>
              <h5 className="font-bold text-gray-800 mb-3">Executive Contact</h5>
              <p className="mb-1">{companySettings?.contactInfo?.phone}</p>
              <p>{companySettings?.contactInfo?.email}</p>
            </div>
          </div>
          
          <div className="text-center bg-gradient-to-r from-gray-800 to-black text-white p-6 rounded-lg">
            <p className="text-2xl font-light text-yellow-400 mb-2">
              Distinguished Partnership Awaits
            </p>
            <p className="text-gray-300">
              We appreciate your confidence in our executive services
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};