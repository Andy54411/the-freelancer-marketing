import React from 'react';
import { TemplateProps } from '../types';

export const CorporateClassicCreditTemplate: React.FC<TemplateProps> = ({ 
  data, 
  companySettings,
  customizations 
}) => {
  const logoUrl = companySettings?.logoUrl || customizations?.logoUrl;

  return (
    <div className="max-w-4xl mx-auto bg-white font-serif">
      {/* Corporate Credit Header */}
      <div className="bg-gradient-to-r from-red-900 to-red-800 text-white p-8 relative">
        <div className="absolute inset-0 bg-red-900 opacity-90"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {logoUrl && (
                <div className="mb-6">
                  <img 
                    src={logoUrl} 
                    alt="Company Logo" 
                    className="h-16 w-auto"
                  />
                </div>
              )}
              <h1 className="text-5xl font-bold mb-2 text-red-100">CREDIT NOTE</h1>
              <p className="text-2xl text-red-200 font-light">Corporate Account Adjustment</p>
              <div className="w-24 h-1 bg-red-300 mt-4"></div>
            </div>
            <div className="text-right bg-red-800 p-6 rounded-lg border border-red-600">
              <h3 className="font-bold text-xl text-red-100 mb-3">{companySettings?.companyName}</h3>
              <div className="text-red-200 space-y-1">
                <p>{companySettings?.address?.street}</p>
                <p>{companySettings?.address?.zipCode} {companySettings?.address?.city}</p>
                <div className="mt-3 pt-3 border-t border-red-600">
                  <p>{companySettings?.contactInfo?.phone}</p>
                  <p>{companySettings?.contactInfo?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Corporate Credit Notice */}
        <div className="mb-8">
          <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded-r-lg">
            <h3 className="text-xl font-bold text-red-900 mb-3 flex items-center">
              <div className="w-8 h-8 bg-red-600 rounded-full mr-3 flex items-center justify-center">
                <span className="text-white font-bold">✓</span>
              </div>
              Corporate Credit Note Authorization
            </h3>
            <p className="text-red-800 leading-relaxed">
              This corporate credit note has been issued in accordance with our standard business 
              practices and accounting procedures. The credit adjustment will be processed through 
              our corporate finance department and applied to your business account as indicated below.
            </p>
            <div className="mt-4 bg-red-600 text-white px-4 py-2 rounded inline-block">
              <p className="font-semibold">Document Reference: #{data.documentNumber}</p>
            </div>
          </div>
        </div>

        {/* Corporate Customer & Credit Details */}
        <div className="grid grid-cols-12 gap-8 mb-8">
          <div className="col-span-8 bg-red-50 border border-red-200 rounded-lg overflow-hidden">
            <div className="bg-red-600 text-white p-4">
              <h3 className="font-bold text-lg">BUSINESS CLIENT INFORMATION</h3>
            </div>
            <div className="p-6">
              <h4 className="text-2xl font-bold text-red-900 mb-3 border-b border-red-300 pb-2">
                {data.customerName}
              </h4>
              <div className="text-gray-700 space-y-2">
                <p className="text-lg">{data.customerAddress?.street}</p>
                <p className="text-lg">{data.customerAddress?.zipCode} {data.customerAddress?.city}</p>
              </div>
              {data.customerContact && (
                <div className="mt-4 pt-4 border-t border-red-200">
                  <p className="text-gray-700 font-medium">
                    <span className="text-red-600 font-semibold">Business Contact:</span> {data.customerContact}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="col-span-4 space-y-4">
            <div className="bg-red-600 text-white p-4 rounded-lg border border-red-700">
              <h4 className="font-semibold mb-2">Credit Issue Date</h4>
              <p className="text-xl font-bold">{data.date}</p>
            </div>
            {data.validUntil && (
              <div className="bg-orange-600 text-white p-4 rounded-lg border border-orange-700">
                <h4 className="font-semibold mb-2">Credit Validity Period</h4>
                <p className="text-xl font-bold">{data.validUntil}</p>
              </div>
            )}
          </div>
        </div>

        {/* Corporate Credit Items Table */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-red-600 pb-2">
            CORPORATE CREDIT ADJUSTMENTS
          </h3>
          
          {/* Table Header */}
          <div className="bg-red-600 text-white p-4 rounded-t-lg">
            <div className="grid grid-cols-12 gap-4 font-semibold">
              <div className="col-span-1">#</div>
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-center">Quantity</div>
              <div className="col-span-2 text-right">Unit Credit</div>
              <div className="col-span-1 text-right">Total</div>
            </div>
          </div>
          
          {/* Table Body */}
          <div className="border border-gray-300 border-t-0 rounded-b-lg overflow-hidden">
            {data.items?.map((item, index) => (
              <div key={index} className={`p-4 border-b border-gray-200 last:border-b-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-1">
                    <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                  </div>
                  <div className="col-span-6">
                    <h4 className="font-semibold text-gray-800 mb-1">{item.description}</h4>
                    {item.details && (
                      <p className="text-gray-600 text-sm">{item.details}</p>
                    )}
                  </div>
                  <div className="col-span-2 text-center">
                    <div className="bg-red-200 rounded px-3 py-1 inline-block">
                      <span className="font-semibold text-red-800">{item.quantity}</span>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="font-semibold text-gray-800">€{item.unitPrice?.toFixed(2)}</p>
                  </div>
                  <div className="col-span-1 text-right">
                    <p className="font-bold text-red-600">€{(item.quantity * item.unitPrice).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Corporate Credit Summary */}
        <div className="flex justify-end mb-8">
          <div className="w-96 bg-red-100 rounded-lg border border-red-300 overflow-hidden">
            <div className="bg-red-600 text-white p-4">
              <h4 className="font-bold text-xl">CORPORATE CREDIT SUMMARY</h4>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-700">Credit Subtotal:</span>
                <span className="font-semibold text-gray-800">€{data.subtotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-700">VAT Credit ({data.taxRate}%):</span>
                <span className="font-semibold text-gray-800">€{data.taxAmount?.toFixed(2)}</span>
              </div>
              <div className="border-t-2 border-red-600 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-800">Total Credit Amount:</span>
                  <span className="text-2xl font-bold text-red-600">€{data.total?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Corporate Credit Process & Compliance */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="bg-red-50 p-6 rounded-lg border border-red-200">
            <h4 className="font-bold text-red-900 mb-4 text-lg">CORPORATE PROCESSING</h4>
            <div className="space-y-3">
              {[
                'Corporate finance department review',
                'Credit authorization and validation',
                'Account reconciliation processing',
                'Audit trail documentation completion'
              ].map((step, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                    {index + 1}
                  </div>
                  <span className="text-gray-700">{step}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h4 className="font-bold text-gray-800 mb-4 text-lg">COMPLIANCE & AUDIT</h4>
            <div className="space-y-3">
              {[
                'Full compliance with accounting standards',
                'Complete audit trail maintenance',
                'Regulatory reporting requirements met',
                'Corporate governance standards applied'
              ].map((compliance, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-3 h-3 bg-gray-600 rounded-full mr-3"></div>
                  <span className="text-gray-700">{compliance}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Corporate Footer */}
        <div className="bg-gray-800 text-white p-8 rounded-lg">
          <div className="grid grid-cols-3 gap-8 text-sm mb-6">
            <div>
              <h5 className="font-bold text-gray-300 mb-3">CORPORATE REGISTRATION</h5>
              <p className="text-gray-400 mb-1">Tax ID: {companySettings?.taxId}</p>
              <p className="text-gray-400">VAT: {companySettings?.vatId}</p>
            </div>
            <div>
              <h5 className="font-bold text-gray-300 mb-3">CORPORATE BANKING</h5>
              <p className="text-gray-400 mb-1">IBAN: {companySettings?.bankDetails?.iban}</p>
              <p className="text-gray-400">BIC: {companySettings?.bankDetails?.bic}</p>
            </div>
            <div>
              <h5 className="font-bold text-gray-300 mb-3">CORPORATE OFFICE</h5>
              <p className="text-gray-400 mb-1">{companySettings?.contactInfo?.phone}</p>
              <p className="text-gray-400">{companySettings?.contactInfo?.email}</p>
            </div>
          </div>
          
          <div className="text-center border-t border-gray-600 pt-6">
            <p className="text-xl font-bold text-red-300 mb-2">
              Corporate Credit Excellence • Professional Financial Management
            </p>
            <p className="text-gray-400">
              This credit note is issued in accordance with corporate accounting standards and regulatory requirements
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};