import React from 'react';
import { TemplateProps } from '../types';

export const CreativeModernOrderTemplate: React.FC<TemplateProps> = ({
  data,
  companySettings,
  customizations,
}) => {
  const logoUrl = companySettings?.logoUrl || customizations?.logoUrl;

  return (
    <div className="max-w-4xl mx-auto bg-white font-sans">
      {/* Professional Header */}
      <div className="bg-gray-900 text-white p-8">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {logoUrl && (
              <div className="bg-white p-2 rounded mb-6 inline-block">
                <img src={logoUrl} alt="Company Logo" className="h-10 w-auto" />
              </div>
            )}
            <h1 className="text-3xl font-bold mb-2 text-white">AUFTRAGSBESTÄTIGUNG</h1>
            <div className="bg-gray-700 px-3 py-1 rounded inline-block">
              <p className="text-sm font-medium">Nr. {data.documentNumber}</p>
            </div>
          </div>
          <div className="text-right bg-gray-800 p-4 rounded">
            <h3 className="font-bold text-lg mb-2">{companySettings?.companyName}</h3>
            <div className="text-gray-300 space-y-1 text-sm">
              <p>{companySettings?.address?.street}</p>
              <p>
                {companySettings?.address?.zipCode} {companySettings?.address?.city}
              </p>
              <div className="mt-2 pt-2 border-t border-gray-600">
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
                Awesome! Your creative order is now confirmed and ready to be brought to life. Our
                talented team is excited to work on your project and deliver something truly
                amazing!
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
              <h4 className="text-xl font-bold text-gray-800">{data.customerName}</h4>
              <div className="text-gray-600 space-y-1">
                <p>{data.customerAddress?.street}</p>
                <p>
                  {data.customerAddress?.zipCode} {data.customerAddress?.city}
                </p>
              </div>
              {data.customerContact && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-gray-700">Kontakt: {data.customerContact}</p>
                </div>
              )}
            </div>
          </div>

          <div className="col-span-4 space-y-3">
            <div className="bg-gray-100 p-4 rounded">
              <h4 className="font-semibold mb-1 text-gray-700">Auftragsdatum</h4>
              <p className="text-lg font-bold text-gray-900">{data.date}</p>
            </div>
            <div className="bg-gray-100 p-4 rounded">
              <h4 className="font-semibold mb-1 text-gray-700">Gültig bis</h4>
              <p className="text-lg font-bold text-gray-900">{data.validUntil || 'Auf Anfrage'}</p>
            </div>
          </div>
        </div>

        {/* Professional Order Details */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2">
            Auftragsdetails
          </h3>

          <div className="space-y-3">
            {data.items?.map((item, index) => (
              <div key={index} className="bg-gray-50 rounded p-4 border border-gray-200">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-1">
                    <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{index + 1}</span>
                    </div>
                  </div>
                  <div className="col-span-6">
                    <h4 className="font-semibold text-gray-800 mb-1">{item.description}</h4>
                    {item.details && <p className="text-gray-600 text-sm">{item.details}</p>}
                  </div>
                  <div className="col-span-2 text-center">
                    <div className="bg-white rounded px-3 py-1 border">
                      <span className="font-semibold text-gray-800">{item.quantity}</span>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-gray-600 text-xs">Einzelpreis</p>
                    <p className="font-semibold">€{item.unitPrice?.toFixed(2)}</p>
                  </div>
                  <div className="col-span-1 text-right">
                    <p className="text-gray-600 text-xs">Gesamt</p>
                    <p className="font-bold text-gray-900">
                      €{(item.quantity * item.unitPrice).toFixed(2)}
                    </p>
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
                  <span className="text-3xl font-bold text-yellow-400">
                    €{data.total?.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Creative Process & Support */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-2xl border border-purple-200">
            <div className="p-6 border-2 border-dashed border-purple-300 rounded-lg">
              <div className="text-center">
                <h4 className="text-xl font-bold text-purple-700 mb-4 flex items-center justify-center">
                  <span className="mr-2">🎯</span> What&apos;s Next?
                </h4>
                <div className="space-y-3">
                  {[
                    'Creative brief review & planning',
                    'Design concepts & iterations',
                    'Your feedback & refinements',
                    'Final delivery & celebration!',
                  ].map((step, index) => (
                    <div key={index} className="flex items-center">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                      <span className="text-gray-700">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-pink-50 to-orange-50 p-6 rounded-2xl border border-pink-200">
            <h4 className="font-bold text-pink-800 mb-4 text-lg flex items-center">
              <span className="mr-2">💬</span> Stay Connected
            </h4>
            <div className="space-y-2">
              {[
                'Projekt-Updates per E-Mail',
                'Direkter Kontakt zum Team',
                'Fortschritts-Dashboard',
                'Regelmäßige Statusgespräche',
              ].map((feature, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-2 h-2 bg-gray-600 rounded-full mr-3"></div>
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Professional Footer */}
        <div className="bg-gray-100 border-t border-gray-300 p-6">
          <div className="grid grid-cols-3 gap-6 text-sm mb-4">
            <div>
              <h5 className="font-semibold text-gray-800 mb-2">Unternehmensdaten</h5>
              <p className="mb-1 text-gray-600">Steuernr.: {companySettings?.taxId}</p>
              <p className="text-gray-600">USt-ID: {companySettings?.vatId}</p>
            </div>
            <div>
              <h5 className="font-semibold text-gray-800 mb-2">Bankverbindung</h5>
              <p className="mb-1 text-gray-600">IBAN: {companySettings?.bankDetails?.iban}</p>
              <p className="text-gray-600">BIC: {companySettings?.bankDetails?.bic}</p>
            </div>
            <div>
              <h5 className="font-semibold text-gray-800 mb-2">Kontakt</h5>
              <p className="mb-1 text-gray-600">{companySettings?.contactInfo?.phone}</p>
              <p className="text-gray-600">{companySettings?.contactInfo?.email}</p>
            </div>
          </div>

          <div className="text-center border-t border-gray-300 pt-4">
            <p className="text-lg font-semibold text-gray-800 mb-1">
              Vielen Dank für Ihr Vertrauen!
            </p>
            <p className="text-gray-600">Wir freuen uns auf die Zusammenarbeit.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
