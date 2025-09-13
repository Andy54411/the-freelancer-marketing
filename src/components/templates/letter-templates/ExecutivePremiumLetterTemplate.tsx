import React from 'react';
import { TemplateProps } from '../types';

export const ExecutivePremiumLetterTemplate: React.FC<TemplateProps> = ({ 
  data, 
  companySettings,
  customizations 
}) => {
  const logoUrl = companySettings?.logoUrl || customizations?.logoUrl;

  return (
    <div className="max-w-4xl mx-auto bg-gradient-to-br from-gray-50 to-slate-100 font-serif">
      {/* Executive Letter Header */}
      <div className="bg-gradient-to-r from-gray-900 via-black to-gray-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 to-amber-300/10"></div>
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
              <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-yellow-400 to-amber-300 bg-clip-text text-transparent">
                EXECUTIVE
              </h1>
              <p className="text-2xl text-gray-300 font-light">CORRESPONDENCE</p>
              <div className="w-24 h-1 bg-gradient-to-r from-yellow-400 to-amber-300 mt-4"></div>
            </div>
            <div className="text-right bg-black/30 backdrop-blur p-6 rounded-xl border border-yellow-400/30">
              <h3 className="font-bold text-xl text-yellow-400 mb-3">{companySettings?.companyName}</h3>
              <div className="text-gray-300 space-y-1">
                <p>{companySettings?.address?.street}</p>
                <p>{companySettings?.address?.zipCode} {companySettings?.address?.city}</p>
                <div className="mt-3 pt-3 border-t border-yellow-400/30">
                  <p>{companySettings?.contactInfo?.phone}</p>
                  <p>{companySettings?.contactInfo?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Executive Letter Details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-800 to-black text-white p-4">
              <h3 className="font-bold text-lg text-yellow-400">DISTINGUISHED RECIPIENT</h3>
            </div>
            <div className="p-6">
              <h4 className="text-2xl font-bold text-gray-800 mb-3 border-b border-yellow-400 pb-2">
                {data.customerName}
              </h4>
              <div className="text-gray-600 space-y-2">
                <p className="text-lg">{data.customerAddress?.street}</p>
                <p className="text-lg">{data.customerAddress?.zipCode} {data.customerAddress?.city}</p>
              </div>
              {data.customerContact && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <p className="text-gray-700 font-medium">
                    <span className="text-yellow-600">Personal Attention:</span> {data.customerContact}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black p-6 rounded-xl shadow-lg">
              <p className="text-sm font-bold mb-2">Executive Reference</p>
              <p className="text-2xl font-bold">{data.documentNumber}</p>
            </div>
            <div className="bg-white border border-gray-300 p-6 rounded-xl shadow-lg">
              <p className="text-sm text-gray-600 font-semibold mb-2">Correspondence Date</p>
              <p className="text-xl font-bold text-gray-800">{data.date}</p>
            </div>
            {data.validUntil && (
              <div className="bg-gradient-to-r from-gray-700 to-black text-white p-6 rounded-xl shadow-lg">
                <p className="text-sm text-yellow-400 font-semibold mb-2">Response Required</p>
                <p className="text-xl font-bold">{data.validUntil}</p>
              </div>
            )}
          </div>
        </div>

        {/* Executive Subject */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-gray-800 to-black text-white p-6 rounded-t-xl">
            <h3 className="text-2xl font-bold text-yellow-400">Executive Communication</h3>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-x-2 border-b-2 border-gray-800 p-8 rounded-b-xl">
            <p className="text-xl text-gray-800 leading-relaxed font-medium">
              Confidential Executive Business Correspondence
            </p>
          </div>
        </div>

        {/* Executive Letter Body */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-100 to-gray-50 border-b border-gray-200 p-6">
              <h4 className="text-lg font-bold text-gray-800">Executive Message</h4>
            </div>
            
            <div className="p-8">
              <p className="text-gray-800 mb-6 text-lg">
                Dear Esteemed {data.customerName?.split(' ')[0] || 'Business Partner'},
              </p>
              
              <div className="space-y-6 text-gray-700 leading-relaxed text-lg">
                <p>
                  It is with great pleasure that we extend this exclusive executive communication 
                  to you. As a distinguished member of our premier business network, your partnership 
                  represents the pinnacle of professional excellence that we strive to maintain.
                </p>
                
                <p>
                  This correspondence has been prepared at the executive level to ensure that all 
                  aspects of our business relationship receive the attention and care that befits 
                  our commitment to exceptional service and partnership excellence.
                </p>

                {data.items && data.items.length > 0 && (
                  <div className="my-8">
                    <h4 className="font-bold text-gray-800 mb-4 text-xl border-b border-yellow-400 pb-2">
                      Executive Summary Points:
                    </h4>
                    <div className="bg-gradient-to-br from-gray-50 to-yellow-50 rounded-xl p-6 border border-yellow-200">
                      {data.items.map((item, index) => (
                        <div key={index} className="border-b border-yellow-200 last:border-b-0 py-4 last:pb-0">
                          <div className="flex items-start">
                            <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-full flex items-center justify-center text-sm font-bold mr-4 mt-1">
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
                  Our executive team remains personally committed to ensuring that your experience 
                  exceeds expectations in every dimension. We understand that excellence is not 
                  merely a goal, but a standard that must be consistently achieved and maintained.
                </p>

                <p>
                  Should you require immediate executive attention on any matter, please utilize 
                  our dedicated executive communication channels. We are honored to serve your 
                  business needs and look forward to the continued success of our partnership.
                </p>
              </div>

              <div className="mt-10 pt-8 border-t-2 border-yellow-400">
                <p className="text-gray-800 mb-8 text-lg">With distinguished regards,</p>
                <div className="space-y-3">
                  <div className="h-20 border-b-2 border-gray-400 w-80"></div>
                  <p className="font-bold text-gray-800 text-lg">{companySettings?.companyName}</p>
                  <p className="text-gray-600 font-medium">Executive Leadership Team</p>
                  <p className="text-yellow-600 font-semibold">Confidential & Privileged Communication</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Executive Financial Summary */}
        {data.total && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-gray-800 to-black text-white rounded-xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black p-4">
                <h4 className="font-bold text-xl">Executive Financial Overview</h4>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white/10 p-4 rounded-lg">
                    <p className="text-yellow-400 font-semibold mb-2">Investment Subtotal:</p>
                    <p className="text-2xl font-bold text-white">€{data.subtotal?.toFixed(2)}</p>
                  </div>
                  <div className="bg-yellow-400/20 p-4 rounded-lg">
                    <p className="text-yellow-400 font-semibold mb-2">Total Executive Investment:</p>
                    <p className="text-2xl font-bold text-yellow-400">€{data.total?.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Executive Footer */}
        <div className="bg-gradient-to-r from-gray-900 via-black to-gray-800 text-white p-8 rounded-xl shadow-xl">
          <div className="grid grid-cols-3 gap-8 text-sm mb-6">
            <div>
              <h5 className="font-bold text-yellow-400 mb-3">Corporate Registry</h5>
              <p className="text-gray-300 mb-1">Tax ID: {companySettings?.taxId}</p>
              <p className="text-gray-300">VAT: {companySettings?.vatId}</p>
            </div>
            <div>
              <h5 className="font-bold text-yellow-400 mb-3">Executive Banking</h5>
              <p className="text-gray-300 mb-1">IBAN: {companySettings?.bankDetails?.iban}</p>
              <p className="text-gray-300">BIC: {companySettings?.bankDetails?.bic}</p>
            </div>
            <div>
              <h5 className="font-bold text-yellow-400 mb-3">Executive Office</h5>
              <p className="text-gray-300 mb-1">{companySettings?.contactInfo?.phone}</p>
              <p className="text-gray-300">{companySettings?.contactInfo?.email}</p>
            </div>
          </div>
          
          <div className="text-center border-t border-yellow-400/30 pt-6">
            <p className="text-xl font-bold text-yellow-400 mb-2">
              Executive Business Excellence • Distinguished Partnership
            </p>
            <p className="text-gray-400">
              This communication is confidential and intended exclusively for executive review
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};