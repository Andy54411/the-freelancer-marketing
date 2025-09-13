import React from 'react';
import { TemplateProps } from '../types';

export const MinimalistElegantOrderTemplate: React.FC<TemplateProps> = ({ 
  data, 
  companySettings,
  customizations 
}) => {
  const logoUrl = companySettings?.logoUrl || customizations?.logoUrl;

  return (
    <div className="max-w-4xl mx-auto bg-white font-light">
      {/* Minimalist Header */}
      <div className="border-b border-gray-200 pb-8 mb-8">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {logoUrl && (
              <div className="mb-8">
                <img 
                  src={logoUrl} 
                  alt="Company Logo" 
                  className="h-8 w-auto grayscale opacity-80"
                />
              </div>
            )}
            <div className="space-y-2">
              <h1 className="text-6xl font-thin text-gray-900 tracking-wider">ORDER</h1>
              <p className="text-xl text-gray-500 tracking-wide">CONFIRMATION</p>
              <div className="w-12 h-px bg-gray-900 mt-4"></div>
            </div>
          </div>
          <div className="text-right max-w-xs">
            <h3 className="font-medium text-gray-900 mb-4 tracking-wide">{companySettings?.companyName}</h3>
            <div className="text-gray-600 space-y-1 text-sm">
              <p>{companySettings?.address?.street}</p>
              <p>{companySettings?.address?.zipCode} {companySettings?.address?.city}</p>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p>{companySettings?.contactInfo?.phone}</p>
                <p>{companySettings?.contactInfo?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {/* Clean Confirmation */}
        <div className="bg-gray-50 p-8 border-l-2 border-gray-900">
          <div className="flex items-center mb-4">
            <div className="w-3 h-3 bg-gray-900 rounded-full mr-4"></div>
            <h3 className="text-xl font-medium text-gray-900 tracking-wide">Order Confirmed</h3>
          </div>
          <p className="text-gray-700 leading-relaxed max-w-2xl">
            Your order has been confirmed and is now being processed. We appreciate your trust in our services 
            and will ensure precise execution of your requirements.
          </p>
          <div className="mt-6 inline-block bg-gray-900 text-white px-4 py-1 text-sm tracking-wider">
            #{data.documentNumber}
          </div>
        </div>

        {/* Minimal Customer & Order Info */}
        <div className="grid grid-cols-12 gap-12">
          <div className="col-span-8">
            <h4 className="text-lg font-medium text-gray-900 mb-6 tracking-wide">CLIENT DETAILS</h4>
            <div className="space-y-4">
              <h5 className="text-2xl font-light text-gray-900">{data.customerName}</h5>
              <div className="text-gray-600 space-y-1">
                <p>{data.customerAddress?.street}</p>
                <p>{data.customerAddress?.zipCode} {data.customerAddress?.city}</p>
              </div>
              {data.customerContact && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <p className="text-gray-700">{data.customerContact}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="col-span-4 space-y-8">
            <div>
              <h4 className="text-sm font-medium text-gray-500 tracking-widest uppercase mb-2">Order Date</h4>
              <p className="text-xl font-light text-gray-900">{data.date}</p>
            </div>
            {data.validUntil && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 tracking-widest uppercase mb-2">Completion</h4>
                <p className="text-xl font-light text-gray-900">{data.validUntil}</p>
              </div>
            )}
          </div>
        </div>

        {/* Minimalist Order Items */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-8 tracking-wide">ORDER DETAILS</h4>
          <div className="space-y-6">
            {data.items?.map((item, index) => (
              <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0">
                <div className="grid grid-cols-12 gap-6 items-center">
                  <div className="col-span-1">
                    <div className="w-8 h-8 bg-gray-900 text-white flex items-center justify-center text-sm">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                  </div>
                  <div className="col-span-6">
                    <h5 className="font-medium text-gray-900 mb-1">{item.description}</h5>
                    {item.details && (
                      <p className="text-gray-600 text-sm">{item.details}</p>
                    )}
                  </div>
                  <div className="col-span-2 text-center">
                    <p className="text-gray-600 text-sm tracking-widest uppercase mb-1">Qty</p>
                    <p className="font-medium text-gray-900">{item.quantity}</p>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-gray-600 text-sm tracking-widest uppercase mb-1">Price</p>
                    <p className="font-light text-gray-900">€{item.unitPrice?.toFixed(2)}</p>
                  </div>
                  <div className="col-span-1 text-right">
                    <p className="text-gray-600 text-sm tracking-widest uppercase mb-1">Total</p>
                    <p className="font-medium text-gray-900">€{(item.quantity * item.unitPrice).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Minimal Order Summary */}
        <div className="flex justify-end">
          <div className="w-80 space-y-4">
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 tracking-wide">Subtotal</span>
              <span className="font-light text-gray-900">€{data.subtotal?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 tracking-wide">VAT ({data.taxRate}%)</span>
              <span className="font-light text-gray-900">€{data.taxAmount?.toFixed(2)}</span>
            </div>
            <div className="border-t-2 border-gray-900 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-xl font-medium text-gray-900 tracking-wide">Total</span>
                <span className="text-2xl font-light text-gray-900">€{data.total?.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Clean Process & Terms */}
        <div className="grid grid-cols-2 gap-12 pt-8 border-t border-gray-200">
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-6 tracking-wide">PROCESS</h4>
            <div className="space-y-4">
              {[
                'Order confirmation received',
                'Processing and preparation',
                'Quality control review',
                'Delivery and completion'
              ].map((step, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-1 h-1 bg-gray-400 rounded-full mr-4"></div>
                  <span className="text-gray-700 font-light">{step}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-6 tracking-wide">SUPPORT</h4>
            <div className="space-y-4">
              {[
                'Direct communication line',
                'Regular progress updates',
                'Quality assurance',
                'Post-delivery support'
              ].map((feature, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-1 h-1 bg-gray-400 rounded-full mr-4"></div>
                  <span className="text-gray-700 font-light">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Minimal Footer */}
        <div className="pt-12 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-8 text-sm mb-8">
            <div>
              <h5 className="font-medium text-gray-900 mb-3 tracking-wide">Company</h5>
              <p className="text-gray-600 mb-1">Tax ID: {companySettings?.taxId}</p>
              <p className="text-gray-600">VAT: {companySettings?.vatId}</p>
            </div>
            <div>
              <h5 className="font-medium text-gray-900 mb-3 tracking-wide">Banking</h5>
              <p className="text-gray-600 mb-1">IBAN: {companySettings?.bankDetails?.iban}</p>
              <p className="text-gray-600">BIC: {companySettings?.bankDetails?.bic}</p>
            </div>
            <div>
              <h5 className="font-medium text-gray-900 mb-3 tracking-wide">Contact</h5>
              <p className="text-gray-600 mb-1">{companySettings?.contactInfo?.phone}</p>
              <p className="text-gray-600">{companySettings?.contactInfo?.email}</p>
            </div>
          </div>
          
          <div className="text-center py-6 border-t border-gray-200">
            <p className="text-gray-600 font-light tracking-wide">
              Thank you for your trust and partnership
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};