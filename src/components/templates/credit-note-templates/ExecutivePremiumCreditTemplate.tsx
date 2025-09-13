import React from 'react';
import { TemplateProps } from '../types';

export const ExecutivePremiumCreditTemplate: React.FC<TemplateProps> = ({ 
  data, 
  companySettings,
  customizations 
}) => {
  const logoUrl = companySettings?.logoUrl || customizations?.logoUrl;

  return (
    <div className="max-w-4xl mx-auto bg-gradient-to-br from-gray-50 to-slate-100 font-serif">
      {/* Executive Credit Header */}
      <div className="bg-gradient-to-r from-gray-900 via-black to-red-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-orange-500/10"></div>
        <div className="relative z-10 p-8">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {logoUrl && (
                <div className="mb-6 bg-white/10 backdrop-blur p-4 rounded-lg inline-block">
                  <img 
                    src={logoUrl} 
                    alt="Company Logo" 
                    className="h-14 w-auto"
                  />
                </div>
              )}
              <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-red-400 to-orange-300 bg-clip-text text-transparent">
                EXECUTIVE
              </h1>
              <p className="text-2xl text-red-200 font-light">CREDIT NOTE</p>
              <div className="w-24 h-1 bg-gradient-to-r from-red-400 to-orange-300 mt-4"></div>
            </div>
            <div className="text-right bg-black/30 backdrop-blur p-6 rounded-xl border border-red-400/30">
              <h3 className="font-bold text-xl text-red-400 mb-3">{companySettings?.companyName}</h3>
              <div className="text-gray-300 space-y-1">
                <p>{companySettings?.address?.street}</p>
                <p>{companySettings?.address?.zipCode} {companySettings?.address?.city}</p>
                <div className="mt-3 pt-3 border-t border-red-400/30">
                  <p>{companySettings?.contactInfo?.phone}</p>
                  <p>{companySettings?.contactInfo?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Executive Credit Notice */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-600 p-8 rounded-r-xl shadow-lg">
            <h3 className="text-2xl font-bold text-red-900 mb-4 flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-orange-500 rounded-xl mr-4 flex items-center justify-center">
                <span className="text-white text-xl">⭐</span>
              </div>
              Executive Credit Authorization
            </h3>
            <p className="text-red-800 leading-relaxed text-lg">
              An executive-level credit adjustment has been authorized for your account. 
              This premium credit processing ensures immediate account reconciliation and 
              reflects our commitment to maintaining the highest standards of customer service.
            </p>
            <div className="mt-4 bg-red-600 text-white px-6 py-2 rounded-full inline-block">
              <p className="font-semibold">Credit Reference: #{data.documentNumber}</p>
            </div>
          </div>
        </div>

        {/* Executive Customer & Credit Details */}
        <div className="grid grid-cols-12 gap-8 mb-8">
          <div className="col-span-8 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-800 to-red-800 text-white p-4">
              <h3 className="font-bold text-lg text-red-200">DISTINGUISHED CLIENT</h3>
            </div>
            <div className="p-6">
              <h4 className="text-2xl font-bold text-gray-800 mb-3 border-b border-red-400 pb-2">
                {data.customerName}
              </h4>
              <div className="text-gray-600 space-y-2">
                <p className="text-lg">{data.customerAddress?.street}</p>
                <p className="text-lg">{data.customerAddress?.zipCode} {data.customerAddress?.city}</p>
              </div>
              {data.customerContact && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <p className="text-gray-700 font-medium">
                    <span className="text-red-600">Executive Contact:</span> {data.customerContact}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="col-span-4 space-y-4">
            <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-6 rounded-xl shadow-lg">
              <p className="text-sm font-bold mb-2 text-red-100">Executive Credit Date</p>
              <p className="text-2xl font-bold">{data.date}</p>
            </div>
            {data.validUntil && (
              <div className="bg-gradient-to-r from-gray-700 to-black text-white p-6 rounded-xl shadow-lg">
                <p className="text-sm text-red-400 font-semibold mb-2">Credit Validity</p>
                <p className="text-xl font-bold">{data.validUntil}</p>
              </div>
            )}
          </div>
        </div>

        {/* Executive Credit Items */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b-2 border-red-600 pb-2">
            EXECUTIVE CREDIT ADJUSTMENTS
          </h3>
          
          <div className="space-y-6">
            {data.items?.map((item, index) => (
              <div key={index} className="bg-white rounded-2xl border-2 border-gray-100 hover:border-red-300 transition-all p-8 hover:shadow-xl">
                <div className="grid grid-cols-12 gap-6 items-center">
                  <div className="col-span-1">
                    <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-orange-500 text-white rounded-xl flex items-center justify-center">
                      <span className="font-bold text-xl">{index + 1}</span>
                    </div>
                  </div>
                  <div className="col-span-6">
                    <h4 className="font-bold text-xl text-gray-800 mb-2">{item.description}</h4>
                    {item.details && (
                      <p className="text-gray-600">{item.details}</p>
                    )}
                  </div>
                  <div className="col-span-2 text-center">
                    <div className="bg-red-100 rounded-xl px-4 py-3">
                      <span className="font-bold text-red-800 text-lg">{item.quantity}</span>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-gray-600 text-sm">Executive Credit</p>
                    <p className="font-bold text-xl">€{item.unitPrice?.toFixed(2)}</p>
                  </div>
                  <div className="col-span-1 text-right">
                    <p className="text-gray-600 text-sm">Total</p>
                    <p className="font-bold text-2xl text-red-600">€{(item.quantity * item.unitPrice).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Executive Credit Summary */}
        <div className="flex justify-end mb-8">
          <div className="w-96 bg-gradient-to-br from-gray-900 to-red-900 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-red-600 to-orange-500 p-6">
              <h4 className="font-bold text-2xl text-white flex items-center">
                <span className="mr-3">💎</span> Executive Credit Total
              </h4>
            </div>
            <div className="p-6 text-white space-y-4">
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-300">Credit Subtotal:</span>
                <span className="font-semibold">€{data.subtotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-300">VAT Credit ({data.taxRate}%):</span>
                <span className="font-semibold">€{data.taxAmount?.toFixed(2)}</span>
              </div>
              <div className="border-t-2 border-red-500 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold">Total Credit Amount:</span>
                  <span className="text-3xl font-bold text-red-400">€{data.total?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Executive Credit Process & Service */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="bg-gradient-to-br from-red-50 to-orange-50 p-8 rounded-2xl border border-red-200">
            <h4 className="font-bold text-red-900 mb-6 text-xl">EXECUTIVE PROCESSING</h4>
            <div className="space-y-4">
              {[
                'Priority executive review and approval',
                'Immediate account credit adjustment',
                'Premium refund processing service',
                'Dedicated executive support follow-up'
              ].map((step, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-4">
                    {index + 1}
                  </div>
                  <span className="text-gray-700 font-medium">{step}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-gray-50 to-slate-100 p-8 rounded-2xl border border-gray-200">
            <h4 className="font-bold text-gray-800 mb-6 text-xl">EXECUTIVE PRIVILEGES</h4>
            <div className="space-y-4">
              {[
                'Expedited 24-hour processing',
                'Personal executive liaison assigned',
                'Premium notification services',
                'Exclusive customer care hotline'
              ].map((privilege, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-3 h-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-full mr-4"></div>
                  <span className="text-gray-700 font-medium">{privilege}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Executive Footer */}
        <div className="bg-gradient-to-r from-gray-900 via-black to-red-900 text-white p-8 rounded-xl shadow-xl">
          <div className="grid grid-cols-3 gap-8 text-sm mb-6">
            <div>
              <h5 className="font-bold text-red-400 mb-3">CORPORATE REGISTRY</h5>
              <p className="text-gray-300 mb-1">Tax ID: {companySettings?.taxId}</p>
              <p className="text-gray-300">VAT: {companySettings?.vatId}</p>
            </div>
            <div>
              <h5 className="font-bold text-red-400 mb-3">EXECUTIVE BANKING</h5>
              <p className="text-gray-300 mb-1">IBAN: {companySettings?.bankDetails?.iban}</p>
              <p className="text-gray-300">BIC: {companySettings?.bankDetails?.bic}</p>
            </div>
            <div>
              <h5 className="font-bold text-red-400 mb-3">EXECUTIVE OFFICE</h5>
              <p className="text-gray-300 mb-1">{companySettings?.contactInfo?.phone}</p>
              <p className="text-gray-300">{companySettings?.contactInfo?.email}</p>
            </div>
          </div>
          
          <div className="text-center border-t border-red-600/30 pt-6">
            <p className="text-xl font-bold text-red-400 mb-2">
              Executive Credit Excellence • Distinguished Client Service
            </p>
            <p className="text-gray-400">
              This executive credit note reflects our unwavering commitment to premium customer satisfaction
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};