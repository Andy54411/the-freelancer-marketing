import React from 'react';
import { TemplateProps } from '../types';

export const CorporateClassicLetterTemplate: React.FC<TemplateProps> = ({ 
  data, 
  companySettings,
  customizations 
}) => {
  const logoUrl = companySettings?.logoUrl || customizations?.logoUrl;

  return (
    <div className="max-w-4xl mx-auto bg-white font-serif">
      {/* Corporate Letter Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 relative">
        <div className="absolute inset-0 bg-blue-900 opacity-90"></div>
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
              <h1 className="text-5xl font-bold mb-2 text-blue-100">CORPORATE</h1>
              <p className="text-2xl text-blue-200 font-light">CORRESPONDENCE</p>
              <div className="w-24 h-1 bg-blue-300 mt-4"></div>
            </div>
            <div className="text-right bg-blue-800 p-6 rounded-lg border border-blue-600">
              <h3 className="font-bold text-xl text-blue-100 mb-3">{companySettings?.companyName}</h3>
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
      </div>

      <div className="p-8">
        {/* Corporate Letter Details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
            <div className="bg-blue-600 text-white p-4">
              <h3 className="font-bold text-lg">ADDRESSEE INFORMATION</h3>
            </div>
            <div className="p-6">
              <h4 className="text-2xl font-bold text-blue-900 mb-3 border-b border-blue-300 pb-2">
                {data.customerName}
              </h4>
              <div className="text-gray-700 space-y-2">
                <p className="text-lg">{data.customerAddress?.street}</p>
                <p className="text-lg">{data.customerAddress?.zipCode} {data.customerAddress?.city}</p>
              </div>
              {data.customerContact && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p className="text-gray-700 font-medium">
                    <span className="text-blue-600 font-semibold">Attention:</span> {data.customerContact}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-blue-600 text-white p-4 rounded-lg border border-blue-700">
              <h4 className="font-semibold mb-2">Document Reference</h4>
              <p className="text-xl font-bold">{data.documentNumber}</p>
            </div>
            <div className="bg-gray-100 border border-gray-300 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-700 mb-2">Correspondence Date</h4>
              <p className="text-xl font-bold text-gray-800">{data.date}</p>
            </div>
            {data.validUntil && (
              <div className="bg-orange-100 border border-orange-300 p-4 rounded-lg">
                <h4 className="font-semibold text-orange-700 mb-2">Response Required By</h4>
                <p className="text-xl font-bold text-orange-800">{data.validUntil}</p>
              </div>
            )}
          </div>
        </div>

        {/* Corporate Subject */}
        <div className="mb-8">
          <div className="bg-blue-600 text-white p-4 rounded-t-lg">
            <h3 className="text-xl font-bold">RE: Corporate Business Matter</h3>
          </div>
          <div className="bg-blue-50 border-x-2 border-b-2 border-blue-600 p-6 rounded-b-lg">
            <p className="text-lg text-gray-800 leading-relaxed font-medium">
              Official Corporate Communication and Business Correspondence
            </p>
          </div>
        </div>

        {/* Corporate Letter Body */}
        <div className="mb-8">
          <div className="bg-white border-2 border-gray-200 rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gray-100 border-b-2 border-gray-200 p-6">
              <h4 className="text-xl font-bold text-gray-800">Official Communication</h4>
            </div>
            
            <div className="p-8">
              <p className="text-gray-800 mb-6 text-lg">
                Dear {data.customerName?.split(' ')[0] || 'Esteemed Business Partner'},
              </p>
              
              <div className="space-y-6 text-gray-700 leading-relaxed text-lg">
                <p>
                  We are writing to you in our official capacity as a corporate entity to address 
                  matters of mutual business interest. This formal correspondence has been prepared 
                  to ensure comprehensive communication regarding our professional relationship and 
                  ongoing business activities.
                </p>
                
                <p>
                  As a valued partner in our corporate network, your business relationship represents 
                  an important component of our organizational strategy. We are committed to maintaining 
                  the highest standards of professional communication and ensuring that all aspects 
                  of our business engagement are properly documented and clearly communicated.
                </p>

                {data.items && data.items.length > 0 && (
                  <div className="my-8">
                    <h4 className="font-bold text-gray-800 mb-4 text-xl border-b-2 border-blue-600 pb-2">
                      Corporate Business Items:
                    </h4>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                      {data.items.map((item, index) => (
                        <div key={index} className={`p-4 border-b border-gray-200 last:border-b-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <div className="flex items-start">
                            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-4 mt-1">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <h5 className="font-bold text-gray-800 mb-2 text-lg">{item.description}</h5>
                              {item.details && (
                                <p className="text-gray-600">{item.details}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p>
                  Our corporate governance standards require that we maintain accurate records of all 
                  business communications and ensure that our partners are fully informed of relevant 
                  developments. This letter serves as part of our commitment to transparency and 
                  professional excellence in all business dealings.
                </p>

                <p>
                  We appreciate your continued partnership and look forward to maintaining our 
                  productive business relationship. Should you require any additional information 
                  or wish to discuss any aspects of this correspondence, please contact our 
                  corporate office at your earliest convenience.
                </p>
              </div>

              <div className="mt-10 pt-8 border-t-2 border-blue-600">
                <p className="text-gray-800 mb-8 text-lg">Respectfully yours,</p>
                <div className="space-y-3">
                  <div className="h-20 border-b-2 border-gray-400 w-80"></div>
                  <p className="font-bold text-gray-800 text-lg">{companySettings?.companyName}</p>
                  <p className="text-gray-600 font-medium">Corporate Communications Department</p>
                  <p className="text-blue-600 font-semibold">Official Business Correspondence</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Corporate Financial Summary */}
        {data.total && (
          <div className="mb-8">
            <div className="bg-blue-600 text-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-blue-700 p-4">
                <h4 className="font-bold text-xl">Corporate Financial Summary</h4>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white/20 p-4 rounded-lg">
                    <p className="text-blue-200 font-semibold mb-2">Business Subtotal:</p>
                    <p className="text-2xl font-bold text-white">€{data.subtotal?.toFixed(2)}</p>
                  </div>
                  <div className="bg-blue-800 p-4 rounded-lg">
                    <p className="text-blue-200 font-semibold mb-2">Total Corporate Amount:</p>
                    <p className="text-2xl font-bold text-blue-100">€{data.total?.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Corporate Footer */}
        <div className="bg-gray-800 text-white p-8 rounded-lg shadow-lg">
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
            <p className="text-xl font-bold text-blue-300 mb-2">
              Corporate Professional Standards • Trusted Business Partnership
            </p>
            <p className="text-gray-400">
              This communication is confidential and may contain legally privileged information
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};