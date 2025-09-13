import React from 'react';
import { TemplateProps } from '../types';

export const CorporateClassicOrderTemplate: React.FC<TemplateProps> = ({ 
  data, 
  companySettings,
  customizations 
}) => {
  const logoUrl = companySettings?.logoUrl || customizations?.logoUrl;

  return (
    <div className="max-w-4xl mx-auto bg-white font-serif">
      {/* Corporate Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 relative">
        <div className="absolute inset-0 bg-blue-900 opacity-90"></div>
        <div className="relative z-10 flex justify-between items-start">
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
            <h1 className="text-5xl font-bold mb-2 text-blue-100">ORDER</h1>
            <p className="text-2xl text-blue-200 font-light">CONFIRMATION</p>
            <div className="bg-blue-700 px-4 py-2 inline-block mt-4 rounded">
              <p className="text-lg font-semibold">Document #{data.documentNumber}</p>
            </div>
          </div>
          <div className="text-right bg-blue-800 p-6 rounded-lg border border-blue-600">
            <h3 className="font-bold text-xl mb-3 text-blue-100">{companySettings?.companyName}</h3>
            <div className="text-blue-200 space-y-1">
              <p>{companySettings?.address?.street}</p>
              <p>{companySettings?.address?.zipCode} {companySettings?.address?.city}</p>
              <div className="mt-3 pt-3 border-t border-blue-600">
                <p>{companySettings?.contactInfo?.phone}</p>
                <p>{companySettings?.contactInfo?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Professional Confirmation Notice */}
        <div className="mb-8">
          <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg">
            <h3 className="text-xl font-bold text-blue-900 mb-3 flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-full mr-3 flex items-center justify-center">
                <span className="text-white font-bold">✓</span>
              </div>
              Order Confirmation Notice
            </h3>
            <p className="text-blue-800 leading-relaxed">
              We are pleased to confirm that your order has been received and approved. 
              This document serves as official confirmation of our business agreement and outlines 
              the terms and specifications of your order.
            </p>
          </div>
        </div>

        {/* Corporate Customer & Order Details */}
        <div className="grid grid-cols-12 gap-8 mb-8">
          <div className="col-span-8 bg-gray-50 p-6 rounded-lg border">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2">
              CLIENT INFORMATION
            </h3>
            <div className="space-y-3">
              <h4 className="text-2xl font-bold text-blue-900">{data.customerName}</h4>
              <div className="text-gray-700 space-y-1">
                <p className="text-lg">{data.customerAddress?.street}</p>
                <p className="text-lg">{data.customerAddress?.zipCode} {data.customerAddress?.city}</p>
              </div>
              {data.customerContact && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <p className="text-gray-700 font-medium">
                    <span className="text-blue-600 font-semibold">Contact:</span> {data.customerContact}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="col-span-4 space-y-4">
            <div className="bg-blue-600 text-white p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Order Date</h4>
              <p className="text-xl font-bold">{data.date}</p>
            </div>
            {data.validUntil && (
              <div className="bg-gray-700 text-white p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Expected Completion</h4>
                <p className="text-xl font-bold">{data.validUntil}</p>
              </div>
            )}
          </div>
        </div>

        {/* Professional Order Items Table */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-blue-600 pb-2">
            ORDER SPECIFICATIONS
          </h3>
          
          {/* Table Header */}
          <div className="bg-blue-600 text-white p-4 rounded-t-lg">
            <div className="grid grid-cols-12 gap-4 font-semibold">
              <div className="col-span-1">#</div>
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-center">Quantity</div>
              <div className="col-span-2 text-right">Unit Price</div>
              <div className="col-span-1 text-right">Total</div>
            </div>
          </div>
          
          {/* Table Body */}
          <div className="border border-gray-300 border-t-0 rounded-b-lg overflow-hidden">
            {data.items?.map((item, index) => (
              <div key={index} className={`p-4 border-b border-gray-200 last:border-b-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-1">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
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
                    <div className="bg-gray-200 rounded px-3 py-1 inline-block">
                      <span className="font-semibold text-gray-800">{item.quantity}</span>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="font-semibold text-gray-800">€{item.unitPrice?.toFixed(2)}</p>
                  </div>
                  <div className="col-span-1 text-right">
                    <p className="font-bold text-blue-600">€{(item.quantity * item.unitPrice).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Corporate Order Summary */}
        <div className="flex justify-end mb-8">
          <div className="w-96 bg-gray-100 rounded-lg border border-gray-300 overflow-hidden">
            <div className="bg-blue-600 text-white p-4">
              <h4 className="font-bold text-xl">ORDER SUMMARY</h4>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-700">Subtotal:</span>
                <span className="font-semibold text-gray-800">€{data.subtotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-700">VAT ({data.taxRate}%):</span>
                <span className="font-semibold text-gray-800">€{data.taxAmount?.toFixed(2)}</span>
              </div>
              <div className="border-t-2 border-blue-600 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-800">Total Amount:</span>
                  <span className="text-2xl font-bold text-blue-600">€{data.total?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Terms & Process */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h4 className="font-bold text-blue-900 mb-4 text-lg">ORDER PROCESSING</h4>
            <div className="space-y-3">
              {[
                'Order verification and approval',
                'Resource allocation and scheduling',
                'Quality assurance protocols',
                'Delivery and final inspection'
              ].map((step, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                    {index + 1}
                  </div>
                  <span className="text-gray-700">{step}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h4 className="font-bold text-gray-800 mb-4 text-lg">BUSINESS SUPPORT</h4>
            <div className="space-y-3">
              {[
                'Dedicated account management',
                'Regular status reporting',
                'Technical support hotline',
                'Post-delivery assistance'
              ].map((feature, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-3 h-3 bg-gray-600 rounded-full mr-3"></div>
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Corporate Footer */}
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
            <p className="text-xl font-bold text-blue-300 mb-2">
              Professional Business Partnership
            </p>
            <p className="text-gray-400">
              We value your business and are committed to delivering excellence in every aspect of our service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};