import React from 'react';
import { TemplateProps } from '../types';

export const ProfessionalBusinessLetterTemplate: React.FC<TemplateProps> = ({ 
  data, 
  companySettings,
  customizations 
}) => {
  const logoUrl = companySettings?.logoUrl || customizations?.logoUrl;

  return (
    <div className="max-w-4xl mx-auto bg-white font-sans">
      {/* Professional Letter Header */}
      <div className="border-b-2 border-blue-600 pb-6 mb-8">
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
            <h1 className="text-4xl font-bold text-blue-600 mb-2">BUSINESS LETTER</h1>
            <p className="text-lg text-gray-600">Professional Correspondence</p>
          </div>
          <div className="text-right bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h3 className="font-bold text-xl text-blue-800 mb-3">{companySettings?.companyName}</h3>
            <div className="text-gray-600 space-y-1">
              <p>{companySettings?.address?.street}</p>
              <p>{companySettings?.address?.zipCode} {companySettings?.address?.city}</p>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p>{companySettings?.contactInfo?.phone}</p>
                <p>{companySettings?.contactInfo?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Letter Details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b border-blue-300 pb-2">
              RECIPIENT
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-xl font-bold text-blue-600 mb-2">{data.customerName}</h4>
              <div className="text-gray-700 space-y-1">
                <p>{data.customerAddress?.street}</p>
                <p>{data.customerAddress?.zipCode} {data.customerAddress?.city}</p>
              </div>
              {data.customerContact && (
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <p className="text-gray-600">Attn: {data.customerContact}</p>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b border-blue-300 pb-2">
              LETTER DETAILS
            </h3>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600 font-semibold mb-1">Reference</p>
                <p className="text-lg font-bold text-blue-800">{data.documentNumber}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 font-semibold mb-1">Date</p>
                <p className="text-lg font-bold text-gray-800">{data.date}</p>
              </div>
              {data.validUntil && (
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <p className="text-sm text-orange-600 font-semibold mb-1">Response by</p>
                  <p className="text-lg font-bold text-orange-800">{data.validUntil}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Letter Subject */}
        <div className="mb-8">
          <div className="bg-blue-600 text-white p-4 rounded-t-lg">
            <h3 className="text-xl font-bold">Subject</h3>
          </div>
          <div className="bg-blue-50 border-x-2 border-b-2 border-blue-600 p-6 rounded-b-lg">
            <p className="text-lg text-gray-800 leading-relaxed">
              Professional Business Correspondence
            </p>
          </div>
        </div>

        {/* Letter Body */}
        <div className="mb-8">
          <div className="prose max-w-none">
            <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
              <p className="text-gray-800 mb-4">Dear {data.customerName?.split(' ')[0] || 'Valued Partner'},</p>
              
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  We hope this letter finds you well. We are writing to you regarding our recent business 
                  interaction and to provide you with important information that requires your attention.
                </p>
                
                <p>
                  Our commitment to maintaining excellent business relationships drives us to ensure 
                  clear and timely communication. The details outlined in this correspondence are 
                  designed to keep you fully informed of all relevant aspects of our business engagement.
                </p>

                {data.items && data.items.length > 0 && (
                  <div className="my-6">
                    <h4 className="font-bold text-gray-800 mb-3">Specific Items of Discussion:</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      {data.items.map((item, index) => (
                        <div key={index} className="border-b border-gray-200 last:border-b-0 py-3 last:pb-0">
                          <div className="flex items-start">
                            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-1">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <h5 className="font-semibold text-gray-800 mb-1">{item.description}</h5>
                              {item.details && (
                                <p className="text-gray-600 text-sm">{item.details}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p>
                  We value your partnership and look forward to continuing our productive business 
                  relationship. Should you have any questions or require clarification on any matter 
                  discussed, please do not hesitate to contact us.
                </p>

                <p>
                  Thank you for your continued trust and cooperation. We appreciate the opportunity 
                  to serve your business needs and remain committed to delivering excellence in all 
                  our interactions.
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-gray-800 mb-6">Sincerely,</p>
                <div className="space-y-2">
                  <div className="h-16 border-b border-gray-300 w-64"></div>
                  <p className="font-semibold text-gray-800">{companySettings?.companyName}</p>
                  <p className="text-gray-600">Authorized Representative</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Summary */}
        {data.total && (
          <div className="mb-8">
            <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg">
              <h4 className="font-bold text-blue-800 mb-3">Financial Summary</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-blue-600 font-semibold">Subtotal:</p>
                  <p className="text-lg font-bold text-blue-800">€{data.subtotal?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-blue-600 font-semibold">Total Amount:</p>
                  <p className="text-xl font-bold text-blue-800">€{data.total?.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Professional Footer */}
        <div className="bg-gray-800 text-white p-6 rounded-lg">
          <div className="grid grid-cols-3 gap-6 text-sm">
            <div>
              <h5 className="font-bold text-gray-300 mb-2">Company Information</h5>
              <p className="text-gray-400 mb-1">Tax ID: {companySettings?.taxId}</p>
              <p className="text-gray-400">VAT: {companySettings?.vatId}</p>
            </div>
            <div>
              <h5 className="font-bold text-gray-300 mb-2">Banking Details</h5>
              <p className="text-gray-400 mb-1">IBAN: {companySettings?.bankDetails?.iban}</p>
              <p className="text-gray-400">BIC: {companySettings?.bankDetails?.bic}</p>
            </div>
            <div>
              <h5 className="font-bold text-gray-300 mb-2">Business Contact</h5>
              <p className="text-gray-400 mb-1">{companySettings?.contactInfo?.phone}</p>
              <p className="text-gray-400">{companySettings?.contactInfo?.email}</p>
            </div>
          </div>
          
          <div className="text-center border-t border-gray-600 pt-4 mt-4">
            <p className="text-blue-300 font-semibold">
              Professional Business Communications • Confidential and Proprietary
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};