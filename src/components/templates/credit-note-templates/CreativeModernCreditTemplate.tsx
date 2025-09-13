import React from 'react';
import { TemplateProps } from '../types';

export const CreativeModernCreditTemplate: React.FC<TemplateProps> = ({ 
  data, 
  companySettings,
  customizations 
}) => {
  const logoUrl = companySettings?.logoUrl || customizations?.logoUrl;

  return (
    <div className="max-w-4xl mx-auto bg-white font-sans">
      {/* Creative Credit Header */}
      <div className="bg-gradient-to-br from-red-500 via-pink-500 to-orange-400 text-white p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full transform translate-x-48 -translate-y-48"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-400 opacity-20 rounded-full transform -translate-x-32 translate-y-32"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {logoUrl && (
                <div className="bg-white/20 backdrop-blur p-3 rounded-xl inline-block mb-6">
                  <img 
                    src={logoUrl} 
                    alt="Company Logo" 
                    className="h-12 w-auto"
                  />
                </div>
              )}
              <h1 className="text-6xl font-bold mb-3 bg-gradient-to-r from-white to-yellow-200 bg-clip-text text-transparent">
                CREDIT
              </h1>
              <h2 className="text-3xl font-light text-yellow-200 mb-4">Note Issued! 🎁</h2>
              <div className="bg-white/20 backdrop-blur px-6 py-3 rounded-full inline-block">
                <p className="text-lg font-medium">✨ #{data.documentNumber}</p>
              </div>
            </div>
            <div className="text-right bg-white/15 backdrop-blur p-6 rounded-2xl">
              <h3 className="font-bold text-xl mb-3">{companySettings?.companyName}</h3>
              <div className="text-pink-100 space-y-1">
                <p>{companySettings?.address?.street}</p>
                <p>{companySettings?.address?.zipCode} {companySettings?.address?.city}</p>
                <div className="mt-3 pt-3 border-t border-white/30">
                  <p>{companySettings?.contactInfo?.phone}</p>
                  <p>{companySettings?.contactInfo?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Creative Credit Notice */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-red-50 via-pink-50 to-orange-50 p-8 rounded-2xl border-l-4 border-red-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-200 to-pink-200 rounded-full opacity-30 transform translate-x-16 -translate-y-16"></div>
            <div className="relative z-10">
              <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl mr-4 flex items-center justify-center">
                  <span className="text-white text-xl">🎉</span>
                </div>
                Your Credit is Ready!
              </h3>
              <p className="text-gray-700 text-lg leading-relaxed">
                Great news! We've processed your credit note and your account has been adjusted. 
                This colorful credit note celebrates our commitment to making things right and 
                ensuring your complete satisfaction with our creative solutions!
              </p>
            </div>
          </div>
        </div>

        {/* Creative Customer & Credit Info */}
        <div className="grid grid-cols-12 gap-6 mb-8">
          <div className="col-span-8 bg-gradient-to-br from-gray-50 to-pink-50 p-6 rounded-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <div className="w-6 h-6 bg-gradient-to-br from-pink-500 to-red-500 rounded-lg mr-3"></div>
              Our Valued Creative Partner
            </h3>
            <div className="space-y-3">
              <h4 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                {data.customerName}
              </h4>
              <div className="text-gray-600 space-y-1">
                <p className="text-lg">{data.customerAddress?.street}</p>
                <p className="text-lg">{data.customerAddress?.zipCode} {data.customerAddress?.city}</p>
              </div>
              {data.customerContact && (
                <div className="mt-4 pt-4 border-t border-pink-200">
                  <p className="text-gray-700 font-medium">
                    <span className="text-red-600">🌟</span> Creative Contact: {data.customerContact}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="col-span-4 space-y-4">
            <div className="bg-gradient-to-br from-red-500 to-pink-600 text-white p-4 rounded-2xl transform hover:scale-105 transition-transform">
              <h4 className="font-semibold mb-2 flex items-center">
                <span className="mr-2">📅</span> Credit Date
              </h4>
              <p className="text-2xl font-bold">{data.date}</p>
            </div>
            {data.validUntil && (
              <div className="bg-gradient-to-br from-orange-500 to-red-500 text-white p-4 rounded-2xl transform hover:scale-105 transition-transform">
                <h4 className="font-semibold mb-2 flex items-center">
                  <span className="mr-2">⏰</span> Valid Until
                </h4>
                <p className="text-2xl font-bold">{data.validUntil}</p>
              </div>
            )}
          </div>
        </div>

        {/* Creative Credit Items */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 via-pink-500 to-orange-500 rounded-xl mr-4 flex items-center justify-center">
              <span className="text-white text-xl">🎁</span>
            </div>
            Creative Credits Applied
          </h3>
          
          <div className="space-y-4">
            {data.items?.map((item, index) => (
              <div key={index} className="bg-white rounded-2xl border-2 border-gray-100 hover:border-red-300 transition-colors p-6 hover:shadow-lg">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-1">
                    <div className={`w-12 h-12 bg-gradient-to-br ${
                      index % 4 === 0 ? 'from-red-500 to-pink-500' :
                      index % 4 === 1 ? 'from-pink-500 to-purple-500' :
                      index % 4 === 2 ? 'from-orange-500 to-red-500' :
                      'from-purple-500 to-pink-500'
                    } rounded-xl flex items-center justify-center`}>
                      <span className="text-white font-bold text-lg">{index + 1}</span>
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
                    <p className="text-gray-600 text-sm">Credit Value</p>
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

        {/* Creative Credit Summary */}
        <div className="flex justify-end mb-8">
          <div className="w-96 bg-gradient-to-br from-gray-900 to-red-900 rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-pink-600 p-6">
              <h4 className="font-bold text-2xl text-white flex items-center">
                <span className="mr-3">💰</span> Creative Credit Total
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
                  <span className="text-3xl font-bold text-yellow-400">€{data.total?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Creative Process & Fun Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="bg-gradient-to-br from-red-50 to-pink-50 p-6 rounded-2xl border border-red-200">
            <h4 className="font-bold text-red-800 mb-4 text-lg flex items-center">
              <span className="mr-2">🎯</span> Credit Magic Process
            </h4>
            <div className="space-y-3">
              {[
                'Creative review & validation ✨',
                'Account adjustment processing 🔄',
                'Refund method optimization 💳',
                'Completion celebration! 🎉'
              ].map((step, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                  <span className="text-gray-700">{step}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-50 to-yellow-50 p-6 rounded-2xl border border-orange-200">
            <h4 className="font-bold text-orange-800 mb-4 text-lg flex items-center">
              <span className="mr-2">💫</span> Creative Perks
            </h4>
            <div className="space-y-3">
              {[
                'Lightning-fast processing ⚡',
                'Colorful status updates 🌈',
                'Happy customer guarantee 😊',
                'Creative support team 🎨'
              ].map((perk, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                  <span className="text-gray-700">{perk}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Creative Footer */}
        <div className="bg-gradient-to-r from-gray-900 via-red-900 to-pink-900 text-white p-8 rounded-2xl">
          <div className="grid grid-cols-3 gap-8 text-sm mb-6">
            <div>
              <h5 className="font-bold text-red-200 mb-3 flex items-center">
                <span className="mr-2">🏢</span> Company Info
              </h5>
              <p className="text-gray-300 mb-1">Tax ID: {companySettings?.taxId}</p>
              <p className="text-gray-300">VAT: {companySettings?.vatId}</p>
            </div>
            <div>
              <h5 className="font-bold text-pink-200 mb-3 flex items-center">
                <span className="mr-2">🏦</span> Banking
              </h5>
              <p className="text-gray-300 mb-1">IBAN: {companySettings?.bankDetails?.iban}</p>
              <p className="text-gray-300">BIC: {companySettings?.bankDetails?.bic}</p>
            </div>
            <div>
              <h5 className="font-bold text-orange-200 mb-3 flex items-center">
                <span className="mr-2">📞</span> Creative Studio
              </h5>
              <p className="text-gray-300 mb-1">{companySettings?.contactInfo?.phone}</p>
              <p className="text-gray-300">{companySettings?.contactInfo?.email}</p>
            </div>
          </div>
          
          <div className="text-center border-t border-red-600 pt-6">
            <p className="text-2xl font-bold text-transparent bg-gradient-to-r from-red-300 via-pink-300 to-orange-300 bg-clip-text mb-2">
              Creative Credits • Happy Customers • Colorful Solutions! 🌈
            </p>
            <p className="text-pink-200">
              Making credits as beautiful as our creative work
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};