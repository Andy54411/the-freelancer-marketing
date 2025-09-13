import React from 'react';
import { TemplateProps } from '../types';

export const CreativeModernLetterTemplate: React.FC<TemplateProps> = ({ 
  data, 
  companySettings,
  customizations 
}) => {
  const logoUrl = companySettings?.logoUrl || customizations?.logoUrl;

  return (
    <div className="max-w-4xl mx-auto bg-white font-sans">
      {/* Creative Letter Header */}
      <div className="bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 text-white p-8 relative overflow-hidden">
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
                CREATIVE
              </h1>
              <h2 className="text-3xl font-light text-yellow-200 mb-4">CORRESPONDENCE</h2>
              <div className="bg-white/20 backdrop-blur px-6 py-3 rounded-full inline-block">
                <p className="text-lg font-medium">✨ Where Ideas Come to Life</p>
              </div>
            </div>
            <div className="text-right bg-white/15 backdrop-blur p-6 rounded-2xl">
              <h3 className="font-bold text-xl mb-3">{companySettings?.companyName}</h3>
              <div className="text-indigo-100 space-y-1">
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
        {/* Creative Letter Details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 rounded-2xl p-6 border-l-4 border-purple-500">
            <h3 className="text-xl font-bold text-purple-800 mb-4 flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg mr-3 flex items-center justify-center">
                <span className="text-white">🎨</span>
              </div>
              Our Creative Partner
            </h3>
            <div className="space-y-3">
              <h4 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {data.customerName}
              </h4>
              <div className="text-gray-600 space-y-1">
                <p className="text-lg">{data.customerAddress?.street}</p>
                <p className="text-lg">{data.customerAddress?.zipCode} {data.customerAddress?.city}</p>
              </div>
              {data.customerContact && (
                <div className="mt-4 pt-4 border-t border-purple-200">
                  <p className="text-gray-700 font-medium">
                    <span className="text-purple-600">🌟</span> Creative Contact: {data.customerContact}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white p-4 rounded-2xl transform hover:scale-105 transition-transform">
              <h4 className="font-semibold mb-2 flex items-center">
                <span className="mr-2">📄</span> Reference
              </h4>
              <p className="text-2xl font-bold">{data.documentNumber}</p>
            </div>
            <div className="bg-gradient-to-br from-pink-500 to-orange-500 text-white p-4 rounded-2xl transform hover:scale-105 transition-transform">
              <h4 className="font-semibold mb-2 flex items-center">
                <span className="mr-2">📅</span> Date
              </h4>
              <p className="text-2xl font-bold">{data.date}</p>
            </div>
            {data.validUntil && (
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4 rounded-2xl transform hover:scale-105 transition-transform">
                <h4 className="font-semibold mb-2 flex items-center">
                  <span className="mr-2">⏰</span> Response by
                </h4>
                <p className="text-2xl font-bold">{data.validUntil}</p>
              </div>
            )}
          </div>
        </div>

        {/* Creative Subject */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white p-6 rounded-t-2xl">
            <h3 className="text-2xl font-bold flex items-center">
              <span className="mr-3">💡</span> Creative Communication
            </h3>
          </div>
          <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 border-x-2 border-b-2 border-purple-500 p-8 rounded-b-2xl">
            <p className="text-xl text-gray-800 leading-relaxed font-medium">
              Innovative Business Correspondence & Creative Collaboration
            </p>
          </div>
        </div>

        {/* Creative Letter Body */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-100 via-pink-100 to-orange-100 border-b-2 border-purple-200 p-6">
              <h4 className="text-xl font-bold text-purple-800 flex items-center">
                <span className="mr-3">🎭</span> Creative Message
              </h4>
            </div>
            
            <div className="p-8">
              <p className="text-gray-800 mb-6 text-lg flex items-center">
                <span className="mr-2">👋</span> Hello Creative {data.customerName?.split(' ')[0] || 'Visionary'},
              </p>
              
              <div className="space-y-6 text-gray-700 leading-relaxed text-lg">
                <p>
                  What an exciting day to connect with such an inspiring creative spirit! 
                  We're absolutely thrilled to reach out and share something special that we've 
                  been crafting just for visionaries like you.
                </p>
                
                <p>
                  Your creative journey and innovative thinking have caught our attention, and we 
                  believe there's magic waiting to happen when great minds collaborate. This 
                  correspondence is designed to spark new possibilities and open doors to 
                  extraordinary creative adventures.
                </p>

                {data.items && data.items.length > 0 && (
                  <div className="my-8">
                    <h4 className="font-bold text-gray-800 mb-4 text-xl flex items-center">
                      <span className="mr-2">🌈</span> Creative Elements:
                    </h4>
                    <div className="space-y-4">
                      {data.items.map((item, index) => (
                        <div key={index} className="bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50 rounded-2xl p-6 border-l-4 border-purple-500 hover:shadow-lg transition-shadow">
                          <div className="flex items-start">
                            <div className={`w-12 h-12 bg-gradient-to-br ${
                              index % 4 === 0 ? 'from-purple-500 to-pink-500' :
                              index % 4 === 1 ? 'from-indigo-500 to-blue-500' :
                              index % 4 === 2 ? 'from-green-500 to-teal-500' :
                              'from-orange-500 to-red-500'
                            } rounded-xl flex items-center justify-center mr-4 mt-1`}>
                              <span className="text-white font-bold text-lg">{index + 1}</span>
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
                  We're passionate about turning dreams into reality and helping creative minds 
                  achieve their most ambitious goals. Every project is an opportunity to create 
                  something truly remarkable, and we can't wait to see what we can build together.
                </p>

                <p>
                  Ready to embark on this creative adventure? We're here to support your vision 
                  every step of the way. Let's create something amazing that the world has never 
                  seen before! 🚀✨
                </p>
              </div>

              <div className="mt-10 pt-8 border-t-2 border-purple-300">
                <p className="text-gray-800 mb-8 text-lg flex items-center">
                  <span className="mr-2">🎨</span> With creative enthusiasm,
                </p>
                <div className="space-y-3">
                  <div className="h-20 border-b-2 border-purple-400 w-80"></div>
                  <p className="font-bold text-gray-800 text-lg">{companySettings?.companyName}</p>
                  <p className="text-purple-600 font-semibold">Creative Innovation Team</p>
                  <p className="text-pink-600 font-medium">Where Imagination Meets Reality ✨</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Creative Financial Summary */}
        {data.total && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-white/20 backdrop-blur p-4">
                <h4 className="font-bold text-xl flex items-center">
                  <span className="mr-3">💰</span> Creative Investment Summary
                </h4>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white/20 backdrop-blur p-4 rounded-xl">
                    <p className="text-yellow-200 font-semibold mb-2 flex items-center">
                      <span className="mr-2">🎯</span> Creative Subtotal:
                    </p>
                    <p className="text-2xl font-bold text-white">€{data.subtotal?.toFixed(2)}</p>
                  </div>
                  <div className="bg-yellow-400/20 backdrop-blur p-4 rounded-xl">
                    <p className="text-yellow-200 font-semibold mb-2 flex items-center">
                      <span className="mr-2">🌟</span> Total Creative Investment:
                    </p>
                    <p className="text-2xl font-bold text-yellow-300">€{data.total?.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Creative Footer */}
        <div className="bg-gradient-to-r from-gray-900 via-purple-900 to-pink-900 text-white p-8 rounded-2xl shadow-xl">
          <div className="grid grid-cols-3 gap-8 text-sm mb-6">
            <div>
              <h5 className="font-bold text-purple-200 mb-3 flex items-center">
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
          
          <div className="text-center border-t border-purple-600 pt-6">
            <p className="text-2xl font-bold text-transparent bg-gradient-to-r from-purple-300 via-pink-300 to-orange-300 bg-clip-text mb-2">
              Creative Innovation • Limitless Possibilities 🌈
            </p>
            <p className="text-purple-200">
              Where every idea becomes an extraordinary reality
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};