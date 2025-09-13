import React from 'react';
import { TemplateProps } from '../types';

export const MinimalistElegantLetterTemplate: React.FC<TemplateProps> = ({ 
  data, 
  companySettings,
  customizations 
}) => {
  const logoUrl = companySettings?.logoUrl || customizations?.logoUrl;

  return (
    <div className="max-w-4xl mx-auto bg-white font-light">
      {/* Minimalist Letter Header */}
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
              <h1 className="text-6xl font-thin text-gray-900 tracking-wider">LETTER</h1>
              <p className="text-xl text-gray-500 tracking-wide">CORRESPONDENCE</p>
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
        {/* Minimal Letter Details */}
        <div className="grid grid-cols-2 gap-12">
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-6 tracking-wide">RECIPIENT</h4>
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
          
          <div className="space-y-8">
            <div>
              <h4 className="text-sm font-medium text-gray-500 tracking-widest uppercase mb-2">Reference</h4>
              <p className="text-xl font-light text-gray-900">{data.documentNumber}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 tracking-widest uppercase mb-2">Date</h4>
              <p className="text-xl font-light text-gray-900">{data.date}</p>
            </div>
            {data.validUntil && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 tracking-widest uppercase mb-2">Response by</h4>
                <p className="text-xl font-light text-gray-900">{data.validUntil}</p>
              </div>
            )}
          </div>
        </div>

        {/* Minimal Subject */}
        <div className="bg-gray-50 p-8 border-l-2 border-gray-900">
          <div className="flex items-center mb-4">
            <div className="w-3 h-3 bg-gray-900 rounded-full mr-4"></div>
            <h4 className="text-lg font-medium text-gray-900 tracking-wide">Subject</h4>
          </div>
          <p className="text-gray-700 leading-relaxed">
            Professional Business Correspondence and Communication
          </p>
        </div>

        {/* Minimal Letter Body */}
        <div>
          <div className="prose max-w-none">
            <div className="space-y-8">
              <p className="text-gray-800">Dear {data.customerName?.split(' ')[0] || 'Colleague'},</p>
              
              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  We write to you today with a matter of importance that requires your attention 
                  and consideration. Our commitment to maintaining clear and direct communication 
                  guides us in reaching out to you through this correspondence.
                </p>
                
                <p>
                  The purpose of this letter is to provide you with essential information 
                  regarding our recent business interaction. We believe in the value of 
                  transparency and wish to ensure that all relevant details are clearly 
                  communicated.
                </p>

                {data.items && data.items.length > 0 && (
                  <div className="my-8">
                    <h4 className="font-medium text-gray-900 mb-6 tracking-wide">Discussion Points</h4>
                    <div className="space-y-6">
                      {data.items.map((item, index) => (
                        <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                          <div className="flex items-start">
                            <div className="w-8 h-8 bg-gray-900 text-white flex items-center justify-center text-sm mr-4 mt-1">
                              {String(index + 1).padStart(2, '0')}
                            </div>
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900 mb-2">{item.description}</h5>
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
                  We value the professional relationship we have established and remain 
                  committed to providing you with the highest standard of service and 
                  communication.
                </p>

                <p>
                  Should you require any clarification or wish to discuss any aspect of 
                  this correspondence, please feel free to contact us. We appreciate your 
                  time and attention to this matter.
                </p>
              </div>

              <div className="mt-12 pt-8 border-t border-gray-200">
                <p className="text-gray-800 mb-8">Sincerely,</p>
                <div className="space-y-3">
                  <div className="h-16 border-b border-gray-300 w-64"></div>
                  <p className="font-medium text-gray-900">{companySettings?.companyName}</p>
                  <p className="text-gray-600 text-sm">Professional Correspondence</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Minimal Financial Summary */}
        {data.total && (
          <div className="border-t border-gray-200 pt-8">
            <h4 className="font-medium text-gray-900 mb-6 tracking-wide">Financial Summary</h4>
            <div className="flex justify-end">
              <div className="w-80 space-y-4">
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 tracking-wide">Subtotal</span>
                  <span className="font-light text-gray-900">€{data.subtotal?.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-300 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900 tracking-wide">Total</span>
                    <span className="text-xl font-light text-gray-900">€{data.total?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
              Professional business correspondence
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};