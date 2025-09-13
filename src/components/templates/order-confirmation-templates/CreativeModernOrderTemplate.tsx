import React from 'react';
import { TemplateProps } from '../types';

export const CreativeModernOrderTemplate: React.FC<TemplateProps> = ({ 
  data, 
  companySettings,
  customizations 
}) => {
  const logoUrl = companySettings?.logoUrl || customizations?.logoUrl;

  return (
    <div className="max-w-4xl mx-auto bg-white font-sans">
      {/* Creative Header */}
      <div className="bg-gradient-to-br from-pink-600 via-purple-600 to-indigo-500 text-white p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full transform translate-x-48 -translate-y-48"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-400 opacity-20 rounded-full transform -translate-x-32 translate-y-32"></div>
        
        <div className="relative z-10 flex justify-between items-start">
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
            <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-white to-yellow-200 bg-clip-text text-transparent">
              ORDER
            </h1>
            <h2 className="text-3xl font-light text-yellow-200">Confirmed! 🎉</h2>
            <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-full inline-block mt-4">
              <p className="text-lg font-medium"># {data.documentNumber}</p>
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

      <div className="p-8">
        {/* Creative Confirmation */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 p-8 rounded-2xl border-l-4 border-purple-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full opacity-30 transform translate-x-16 -translate-y-16"></div>
            <div className="relative z-10">
              <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg mr-4 flex items-center justify-center">
                  <span className="text-white">🎊</span>
                </div>
                Your Order is Confirmed!
              </h3>
              <p className="text-gray-700 text-lg leading-relaxed">
                Awesome! Your creative order is now confirmed and ready to be brought to life. 
                Our talented team is excited to work on your project and deliver something truly amazing!
              </p>
            </div>
          </div>
        </div>

        {/* Modern Customer & Order Info */}
        <div className="grid grid-cols-12 gap-6 mb-8">
          <div className="col-span-8 bg-gradient-to-br from-gray-50 to-indigo-50 p-6 rounded-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg mr-3"></div>
              Our Creative Partner
            </h3>
            <div className="space-y-3">
              <h4 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {data.customerName}
              </h4>
              <div className="text-gray-600 space-y-1">
                <p className="text-lg">{data.customerAddress?.street}</p>
                <p className="text-lg">{data.customerAddress?.zipCode} {data.customerAddress?.city}</p>
              </div>
              {data.customerContact && (
                <div className="mt-4 pt-4 border-t border-indigo-200">
                  <p className="text-gray-700 font-medium">
                    <span className="text-indigo-600">🎨</span> Contact: {data.customerContact}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="col-span-4 space-y-4">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4 rounded-2xl transform hover:scale-105 transition-transform">
              <h4 className="font-semibold mb-2 flex items-center">
                <span className="mr-2">📅</span> Order Date
              </h4>
              <p className="text-2xl font-bold">{data.date}</p>
            </div>
            <div className="bg-gradient-to-br from-pink-500 to-orange-500 text-white p-4 rounded-2xl transform hover:scale-105 transition-transform">
              <h4 className="font-semibold mb-2 flex items-center">
                <span className="mr-2">🚀</span> Launch Date
              </h4>
              <p className="text-2xl font-bold">{data.validUntil || 'Soon!'}</p>
            </div>
          </div>
        </div>

        {/* Creative Order Showcase */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 rounded-xl mr-4 flex items-center justify-center">
              <span className="text-white text-xl">✨</span>
            </div>
            What We're Creating For You
          </h3>
          
          <div className="space-y-4">
            {data.items?.map((item, index) => (
              <div key={index} className="bg-white rounded-2xl border-2 border-gray-100 hover:border-indigo-300 transition-colors p-6 hover:shadow-lg">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-1">
                    <div className={`w-12 h-12 bg-gradient-to-br ${
                      index % 4 === 0 ? 'from-purple-500 to-pink-500' :
                      index % 4 === 1 ? 'from-indigo-500 to-blue-500' :
                      index % 4 === 2 ? 'from-green-500 to-teal-500' :
                      'from-orange-500 to-red-500'
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
                    <div className="bg-gray-100 rounded-full px-4 py-2">
                      <span className="font-bold text-gray-800">{item.quantity}</span>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-gray-600 text-sm">Unit Price</p>
                    <p className="font-bold text-lg">€{item.unitPrice?.toFixed(2)}</p>
                  </div>
                  <div className="col-span-1 text-right">
                    <p className="text-gray-600 text-sm">Total</p>
                    <p className="font-bold text-xl text-indigo-600">€{(item.quantity * item.unitPrice).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Creative Order Summary */}
        <div className="flex justify-end mb-8">
          <div className="w-96 bg-gradient-to-br from-gray-900 to-indigo-900 rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
              <h4 className="font-bold text-2xl text-white flex items-center">
                <span className="mr-3">💝</span> Order Total
              </h4>
            </div>
            <div className="p-6 text-white space-y-4">
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-300">Subtotal:</span>
                <span className="font-semibold">€{data.subtotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-300">VAT ({data.taxRate}%):</span>
                <span className="font-semibold">€{data.taxAmount?.toFixed(2)}</span>
              </div>
              <div className="border-t-2 border-purple-500 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold">Total Amount:</span>
                  <span className="text-3xl font-bold text-yellow-400">€{data.total?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Creative Process & Support */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-2xl border border-purple-200">
            <h4 className="font-bold text-purple-800 mb-4 text-lg flex items-center">
              <span className="mr-2">🎯</span> What's Next?
            </h4>
            <div className="space-y-3">
              {[
                'Creative brief review & planning',
                'Design concepts & iterations',
                'Your feedback & refinements',
                'Final delivery & celebration!'
              ].map((step, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                  <span className="text-gray-700">{step}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-pink-50 to-orange-50 p-6 rounded-2xl border border-pink-200">
            <h4 className="font-bold text-pink-800 mb-4 text-lg flex items-center">
              <span className="mr-2">💬</span> Stay Connected
            </h4>
            <div className="space-y-3">
              {[
                'Project updates via email',
                'Creative team direct line',
                'Progress tracking dashboard',
                'Video calls for major milestones'
              ].map((feature, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-2 h-2 bg-pink-500 rounded-full mr-3"></div>
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Creative Footer */}
        <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900 text-white p-8 rounded-2xl">
          <div className="grid grid-cols-3 gap-8 text-sm mb-6">
            <div>
              <h5 className="font-bold text-purple-200 mb-3">Company Info</h5>
              <p className="mb-1 text-gray-300">Tax ID: {companySettings?.taxId}</p>
              <p className="text-gray-300">VAT: {companySettings?.vatId}</p>
            </div>
            <div>
              <h5 className="font-bold text-purple-200 mb-3">Banking</h5>
              <p className="mb-1 text-gray-300">IBAN: {companySettings?.bankDetails?.iban}</p>
              <p className="text-gray-300">BIC: {companySettings?.bankDetails?.bic}</p>
            </div>
            <div>
              <h5 className="font-bold text-purple-200 mb-3">Creative Team</h5>
              <p className="mb-1 text-gray-300">{companySettings?.contactInfo?.phone}</p>
              <p className="text-gray-300">{companySettings?.contactInfo?.email}</p>
            </div>
          </div>
          
          <div className="text-center border-t border-purple-700 pt-6">
            <p className="text-2xl font-bold text-yellow-400 mb-2">
              Ready to Create Magic Together! 🌟✨
            </p>
            <p className="text-purple-200">
              Your creative journey starts now - let's make something incredible!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};