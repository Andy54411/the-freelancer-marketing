import React from 'react';
import { TemplateProps } from '../types';

export const CorporateClassicLetterTemplate: React.FC<TemplateProps> = ({
  data,
  companySettings,
  customizations,
}) => {
  const logoUrl = companySettings?.logoUrl || customizations?.logoUrl;

  return (
    <div className="max-w-4xl mx-auto bg-white font-serif">
      {/* Corporate Letter Header */}
      <div className="bg-white p-8 border-b border-gray-200 relative">
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {logoUrl && (
                <div className="mb-6">
                  <img src={logoUrl} alt="Company Logo" className="h-16 w-auto" />
                </div>
              )}
              <h1 className="text-4xl font-bold mb-2 text-gray-900">CORPORATE</h1>
              <p className="text-xl text-gray-600 font-light">CORRESPONDENCE</p>
              <div className="w-24 h-px bg-gray-300 mt-4"></div>
            </div>
            <div className="text-right bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="font-bold text-xl text-gray-900 mb-3">
                {companySettings?.companyName}
              </h3>
              <div className="text-gray-700 space-y-1">
                <p>{companySettings?.address?.street}</p>
                <p>
                  {companySettings?.address?.zipCode} {companySettings?.address?.city}
                </p>
                <div className="mt-3 pt-3 border-t border-gray-300">
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
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-100 text-gray-900 p-4 border-b border-gray-200">
              <h3 className="font-bold text-lg">ADDRESSEE INFORMATION</h3>
            </div>
            <div className="p-6">
              <h4 className="text-2xl font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2">
                {data.customerName}
              </h4>
              <div className="text-gray-700 space-y-2">
                <p className="text-lg">{data.customerAddress?.street}</p>
                <p className="text-lg">
                  {data.customerAddress?.zipCode} {data.customerAddress?.city}
                </p>
              </div>
              {data.customerContact && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-gray-700 font-medium">
                    <span className="text-gray-900 font-semibold">Attention:</span>{' '}
                    {data.customerContact}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-100 text-gray-900 p-4 rounded-lg border border-gray-200">
              <h4 className="font-semibold mb-2">Document Reference</h4>
              <p className="text-xl font-bold text-gray-900">{data.documentNumber}</p>
            </div>
            <div className="bg-gray-100 border border-gray-300 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-700 mb-2">Correspondence Date</h4>
              <p className="text-xl font-bold text-gray-800">{data.date}</p>
            </div>
            {data.validUntil && (
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-700 mb-2">Response Required By</h4>
                <p className="text-xl font-bold text-gray-900">{data.validUntil}</p>
              </div>
            )}
          </div>
        </div>

        {/* Corporate Subject */}
        <div className="mb-8">
          <div className="bg-gray-100 text-gray-900 p-4 rounded-t-lg border border-gray-200">
            <h3 className="text-xl font-bold">RE: Corporate Business Matter</h3>
          </div>
          <div className="bg-white border border-gray-200 p-6 rounded-b-lg">
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
                  As a valued partner in our corporate network, your business relationship
                  represents an important component of our organizational strategy. We are committed
                  to maintaining the highest standards of professional communication and ensuring
                  that all aspects of our business engagement are properly documented and clearly
                  communicated.
                </p>

                {data.items && data.items.length > 0 && (
                  <div className="my-8">
                    <h4 className="font-bold text-gray-800 mb-4 text-xl border-b border-gray-300 pb-2">
                      Corporate Business Items:
                    </h4>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                      {data.items.map((item, index) => (
                        <div
                          key={index}
                          className={`p-4 border-b border-gray-200 last:border-b-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                        >
                          <div className="flex items-start">
                            <div className="w-8 h-8 bg-gray-200 text-gray-900 rounded-full flex items-center justify-center font-bold mr-4 mt-1">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <h5 className="font-bold text-gray-800 mb-2 text-lg">
                                {item.description}
                              </h5>
                              {item.details && <p className="text-gray-600">{item.details}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p>
                  Our corporate governance standards require that we maintain accurate records of
                  all business communications and ensure that our partners are fully informed of
                  relevant developments. This letter serves as part of our commitment to
                  transparency and professional excellence in all business dealings.
                </p>

                <p>
                  We appreciate your continued partnership and look forward to maintaining our
                  productive business relationship. Should you require any additional information or
                  wish to discuss any aspects of this correspondence, please contact our corporate
                  office at your earliest convenience.
                </p>
              </div>

              <div className="mt-10 pt-8 border-t border-gray-300">
                <p className="text-gray-800 mb-8 text-lg">Respectfully yours,</p>
                <div className="space-y-3">
                  <div className="h-20 border-b-2 border-gray-400 w-80"></div>
                  <p className="font-bold text-gray-800 text-lg">{companySettings?.companyName}</p>
                  <p className="text-gray-600 font-medium">Corporate Communications Department</p>
                  <p className="text-gray-800 font-semibold">Official Business Correspondence</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Corporate Financial Summary */}
        {data.total && (
          <div className="mb-8">
            <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
              <div className="bg-gray-100 p-4 border-b border-gray-200">
                <h4 className="font-bold text-xl text-gray-900">Corporate Financial Summary</h4>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-gray-600 font-semibold mb-2">Business Subtotal:</p>
                    <p className="text-2xl font-bold text-gray-900">€{data.subtotal?.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-gray-600 font-semibold mb-2">Total Corporate Amount:</p>
                    <p className="text-2xl font-bold text-gray-900">€{data.total?.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Corporate Footer */}
        <div className="bg-gray-50 text-gray-900 p-8 rounded-lg border border-gray-200">
          <div className="grid grid-cols-3 gap-8 text-sm mb-6">
            <div>
              <h5 className="font-bold text-gray-800 mb-3">CORPORATE REGISTRATION</h5>
              <p className="text-gray-700 mb-1">Tax ID: {companySettings?.taxId}</p>
              <p className="text-gray-700">VAT: {companySettings?.vatId}</p>
            </div>
            <div>
              <h5 className="font-bold text-gray-800 mb-3">CORPORATE BANKING</h5>
              <p className="text-gray-700 mb-1">IBAN: {companySettings?.bankDetails?.iban}</p>
              <p className="text-gray-700">BIC: {companySettings?.bankDetails?.bic}</p>
            </div>
            <div>
              <h5 className="font-bold text-gray-800 mb-3">CORPORATE OFFICE</h5>
              <p className="text-gray-700 mb-1">{companySettings?.contactInfo?.phone}</p>
              <p className="text-gray-700">{companySettings?.contactInfo?.email}</p>
            </div>
          </div>

          <div className="text-center border-t border-gray-300 pt-6">
            <p className="text-xl font-bold text-gray-900 mb-2">
              Corporate Professional Standards • Trusted Business Partnership
            </p>
            <p className="text-gray-600">
              This communication is confidential and may contain legally privileged information
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
