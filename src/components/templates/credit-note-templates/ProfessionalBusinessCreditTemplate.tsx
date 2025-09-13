import React from 'react';
import { TemplateProps } from '../types';

export const ProfessionalBusinessCreditTemplate: React.FC<TemplateProps> = ({ 
  data, 
  companySettings,
  customizations 
}) => {
  const logoUrl = companySettings?.logoUrl || customizations?.logoUrl;

  return (
    <div className="max-w-4xl mx-auto bg-white font-sans">
      {/* Professional Credit Note Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-8">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {logoUrl && (
              <div className="mb-6 bg-white/10 backdrop-blur p-3 rounded-lg inline-block">
                <img 
                  src={logoUrl} 
                  alt="Company Logo" 
                  className="h-12 w-auto"
                />
              </div>
            )}
            <h1 className="text-5xl font-bold mb-2 text-red-100">CREDIT NOTE</h1>
            <p className="text-xl text-red-200">Professional Refund Documentation</p>
            <div className="bg-red-800 px-4 py-2 inline-block mt-4 rounded">
              <p className="text-lg font-semibold">#{data.documentNumber}</p>
            </div>
          </div>
          <div className="text-right bg-red-800 p-6 rounded-lg border border-red-500">
            <h3 className="font-bold text-xl text-red-100 mb-3">{companySettings?.companyName}</h3>
            <div className="text-red-200 space-y-1">
              <p>{companySettings?.address?.street}</p>
              <p>{companySettings?.address?.zipCode} {companySettings?.address?.city}</p>
              <div className="mt-3 pt-3 border-t border-red-500">
                <p>{companySettings?.contactInfo?.phone}</p>
                <p>{companySettings?.contactInfo?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Credit Note Notice */}
        <div className="mb-8">
          <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded-r-lg">
            <h3 className="text-xl font-bold text-red-900 mb-3 flex items-center">
              <div className="w-8 h-8 bg-red-600 rounded-full mr-3 flex items-center justify-center">
                <span className="text-white font-bold">↺</span>
              </div>
              Credit Note Issued
            </h3>
            <p className="text-red-800 leading-relaxed">
              This credit note has been issued to adjust your account for returned items, 
              cancelled services, or other credited amounts. The credit will be applied to 
              your account or refunded according to your original payment method.
            </p>
          </div>
        </div>

        {/* Customer & Credit Details */}
        <div className="grid grid-cols-12 gap-8 mb-8">
          <div className="col-span-8 bg-gray-50 p-6 rounded-lg border">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2">
              CUSTOMER INFORMATION
            </h3>
            <div className="space-y-3">
              <h4 className="text-2xl font-bold text-red-900">{data.customerName}</h4>
              <div className="text-gray-700 space-y-1">
                <p className="text-lg">{data.customerAddress?.street}</p>
                <p className="text-lg">{data.customerAddress?.zipCode} {data.customerAddress?.city}</p>
              </div>
              {data.customerContact && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <p className="text-gray-700 font-medium">
                    <span className="text-red-600 font-semibold">Contact:</span> {data.customerContact}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="col-span-4 space-y-4">
            <div className="bg-red-600 text-white p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Credit Date</h4>
              <p className="text-xl font-bold">{data.date}</p>
            </div>
            {data.validUntil && (
              <div className="bg-orange-600 text-white p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Credit Valid Until</h4>
                <p className="text-xl font-bold">{data.validUntil}</p>
              </div>
            )}
          </div>
        </div>

        {/* Credit Items */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-red-600 pb-2">
            CREDITED ITEMS
          </h3>
          
          <div className="space-y-4">
            {data.items?.map((item, index) => (
              <div key={index} className="bg-white rounded-lg border-2 border-gray-100 hover:border-red-300 transition-colors p-6 hover:shadow-lg">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-1">
                    <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center">
                      <span className="font-bold text-lg">{index + 1}</span>
                    </div>
                  </div>
                  <div className="col-span-6">
                    <h4 className="font-bold text-lg text-gray-800 mb-1">{item.description}</h4>
                    {item.details && (
                      <p className="text-gray-600 text-sm">{item.details}</p>
                    )}
                  </div>
                  <div className="col-span-2 text-center">
                    <div className="bg-red-100 rounded-full px-4 py-2">
                      <span className="font-bold text-red-800">{item.quantity}</span>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-gray-600 text-sm">Unit Credit</p>
                    <p className="font-bold text-lg">€{item.unitPrice?.toFixed(2)}</p>
                  </div>
                  <div className="col-span-1 text-right">
                    <p className="text-gray-600 text-sm">Total</p>
                    <p className="font-bold text-xl text-red-600">€{(item.quantity * item.unitPrice).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Credit Summary */}
        <div className="flex justify-end mb-8">
          <div className="w-96 bg-red-50 rounded-lg border border-red-200 overflow-hidden">
            <div className="bg-red-600 text-white p-4">
              <h4 className="font-bold text-xl">CREDIT SUMMARY</h4>
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
                  <span className="text-3xl font-bold text-red-600">€{data.total?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Credit Process & Information */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="bg-red-50 p-6 rounded-lg border border-red-200">
            <h4 className="font-bold text-red-800 mb-4 text-lg">CREDIT PROCESSING</h4>
            <div className="space-y-3">
              {[
                'Credit note validation and approval',
                'Account adjustment processing',
                'Refund method determination',
                'Payment processing completion'
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
          
          <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
            <h4 className="font-bold text-orange-800 mb-4 text-lg">IMPORTANT NOTES</h4>
            <div className="space-y-3">
              {[
                'Credit applied to original payment method',
                'Processing time: 3-5 business days',
                'Notification will be sent upon completion',
                'Contact support for any questions'
              ].map((note, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
                  <span className="text-gray-700">{note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Professional Footer */}
        <div className="bg-gray-800 text-white p-8 rounded-lg">
          <div className="grid grid-cols-3 gap-8 text-sm mb-6">
            <div>
              <h5 className="font-bold text-gray-300 mb-3">COMPANY DETAILS</h5>
              <p className="mb-1 text-gray-400">Tax ID: {companySettings?.taxId}</p>
              <p className="text-gray-400">VAT: {companySettings?.vatId}</p>
            </div>
            <div>
              <h5 className="font-bold text-gray-300 mb-3">BANKING INFORMATION</h5>
              <p className="mb-1 text-gray-400">IBAN: {companySettings?.bankDetails?.iban}</p>
              <p className="text-gray-400">BIC: {companySettings?.bankDetails?.bic}</p>
            </div>
            <div>
              <h5 className="font-bold text-gray-300 mb-3">BUSINESS CONTACT</h5>
              <p className="mb-1 text-gray-400">{companySettings?.contactInfo?.phone}</p>
              <p className="text-gray-400">{companySettings?.contactInfo?.email}</p>
            </div>
          </div>
          
          <div className="text-center border-t border-gray-600 pt-6">
            <p className="text-xl font-bold text-red-300 mb-2">
              Professional Credit Processing • Customer Satisfaction Guaranteed
            </p>
            <p className="text-gray-400">
              This credit note serves as official documentation of your account adjustment
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};