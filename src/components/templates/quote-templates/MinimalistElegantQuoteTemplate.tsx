import React from 'react';
import { TemplateProps } from '../types';

export const MinimalistElegantQuoteTemplate: React.FC<TemplateProps> = ({ 
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
              <img 
                src={logoUrl} 
                alt="Company Logo" 
                className="h-12 w-auto mb-8 grayscale"
              />
            )}
            <h1 className="text-6xl font-thin text-gray-900 mb-2 tracking-wider">QUOTE</h1>
            <p className="text-gray-500 text-lg tracking-wide">{data.documentNumber}</p>
          </div>
          <div className="text-right text-gray-600 space-y-1">
            <h2 className="font-medium text-xl text-gray-900 mb-3">{companySettings?.companyName}</h2>
            <p className="text-sm">{companySettings?.address?.street}</p>
            <p className="text-sm">{companySettings?.address?.zipCode} {companySettings?.address?.city}</p>
            <p className="text-sm mt-4">{companySettings?.contactInfo?.phone}</p>
            <p className="text-sm">{companySettings?.contactInfo?.email}</p>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {/* Minimalist Client Information */}
        <div className="grid grid-cols-2 gap-16">
          <div>
            <h3 className="text-xs uppercase tracking-widest text-gray-400 mb-4 font-medium">Client</h3>
            <div className="space-y-2">
              <h4 className="text-2xl font-light text-gray-900">{data.customerName}</h4>
              <p className="text-gray-600">{data.customerAddress?.street}</p>
              <p className="text-gray-600">{data.customerAddress?.zipCode} {data.customerAddress?.city}</p>
              {data.customerContact && (
                <p className="text-gray-600 mt-4 pt-4 border-t border-gray-100">
                  {data.customerContact}
                </p>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-xs uppercase tracking-widest text-gray-400 mb-4 font-medium">Details</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Date</p>
                <p className="text-xl font-light">{data.date}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Valid Until</p>
                <p className="text-xl font-light">{data.validUntil}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Minimalist Items */}
        <div>
          <h3 className="text-xs uppercase tracking-widest text-gray-400 mb-8 font-medium">Services</h3>
          
          <div className="space-y-6">
            {data.items?.map((item, index) => (
              <div key={index} className="border-b border-gray-100 pb-6 last:border-b-0">
                <div className="grid grid-cols-12 gap-4 items-start">
                  <div className="col-span-1">
                    <span className="text-gray-400 font-light text-lg">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="col-span-7">
                    <h4 className="text-lg font-light text-gray-900 mb-1">{item.description}</h4>
                    {item.details && (
                      <p className="text-sm text-gray-500 leading-relaxed">{item.details}</p>
                    )}
                  </div>
                  <div className="col-span-1 text-center">
                    <span className="text-gray-600 font-light">{item.quantity}</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-sm text-gray-400 mb-1">€{item.unitPrice?.toFixed(2)}</p>
                  </div>
                  <div className="col-span-1 text-right">
                    <p className="text-lg font-light text-gray-900">
                      €{(item.quantity * item.unitPrice).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Minimalist Totals */}
        <div className="flex justify-end">
          <div className="w-80 space-y-4">
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500 font-light">Subtotal</span>
              <span className="text-gray-900 font-light">€{data.subtotal?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500 font-light">VAT ({data.taxRate}%)</span>
              <span className="text-gray-900 font-light">€{data.taxAmount?.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-xl font-light text-gray-900">Total</span>
                <span className="text-2xl font-light text-gray-900">€{data.total?.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Minimalist Terms */}
        <div className="pt-8 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-16">
            <div>
              <h4 className="text-xs uppercase tracking-widest text-gray-400 mb-4 font-medium">Terms</h4>
              <div className="space-y-3 text-sm text-gray-600">
                <p>Payment terms: Net 30 days</p>
                <p>Quote validity: {data.validUntil}</p>
                <p>Delivery: As agreed upon confirmation</p>
                <p>All amounts exclude applicable taxes</p>
              </div>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-widest text-gray-400 mb-4 font-medium">Notes</h4>
              <div className="space-y-3 text-sm text-gray-600">
                <p>Thank you for considering our services</p>
                <p>We look forward to working with you</p>
                <p>Please contact us with any questions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Minimalist Footer */}
        <div className="pt-8 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-8 text-xs text-gray-400">
            <div>
              <p className="mb-1">Tax ID: {companySettings?.taxId}</p>
              <p>VAT: {companySettings?.vatId}</p>
            </div>
            <div>
              <p className="mb-1">IBAN: {companySettings?.bankDetails?.iban}</p>
              <p>BIC: {companySettings?.bankDetails?.bic}</p>
            </div>
            <div>
              <p className="mb-1">{companySettings?.contactInfo?.phone}</p>
              <p>{companySettings?.contactInfo?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};