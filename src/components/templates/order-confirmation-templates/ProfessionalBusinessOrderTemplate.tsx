import React from 'react';
import { TemplateProps } from '../types';

export const ProfessionalBusinessOrderTemplate: React.FC<TemplateProps> = ({ 
  data, 
  companySettings,
  customizations 
}) => {
  const logoUrl = companySettings?.logoUrl || customizations?.logoUrl;

  return (
    <div className="max-w-4xl mx-auto bg-white font-sans">
      {/* Professional Header */}
      <div className="bg-gradient-to-r from-green-700 to-green-800 text-white p-8">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {logoUrl && (
              <img 
                src={logoUrl} 
                alt="Company Logo" 
                className="h-16 w-auto mb-4 bg-white p-2 rounded"
              />
            )}
            <h1 className="text-4xl font-bold mb-2">ORDER CONFIRMATION</h1>
            <p className="text-xl text-green-200">Order #{data.documentNumber}</p>
          </div>
          <div className="text-right bg-white/10 p-4 rounded-lg backdrop-blur">
            <h2 className="font-bold text-xl mb-2">{companySettings?.companyName}</h2>
            <div className="text-green-100 space-y-1">
              <p>{companySettings?.address?.street}</p>
              <p>{companySettings?.address?.zipCode} {companySettings?.address?.city}</p>
              <p className="mt-2">{companySettings?.contactInfo?.phone}</p>
              <p>{companySettings?.contactInfo?.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Confirmation Message */}
        <div className="mb-8 p-6 bg-green-50 border-l-4 border-green-500 rounded-r">
          <h3 className="text-xl font-bold text-green-800 mb-3">Order Successfully Confirmed</h3>
          <p className="text-green-700 text-lg">
            Thank you for your order! We are pleased to confirm that your order has been received 
            and is being processed. Below are the details of your confirmed order.
          </p>
        </div>

        {/* Customer & Order Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <div className="w-4 h-4 bg-green-600 rounded-full mr-3"></div>
              CUSTOMER INFORMATION
            </h3>
            <div className="space-y-2">
              <p className="text-xl font-semibold text-gray-900">{data.customerName}</p>
              <p className="text-gray-600">{data.customerAddress?.street}</p>
              <p className="text-gray-600">{data.customerAddress?.zipCode} {data.customerAddress?.city}</p>
              {data.customerContact && (
                <p className="text-gray-600 mt-3 pt-3 border-t border-gray-300">
                  Contact: {data.customerContact}
                </p>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Order Date</h4>
              <p className="text-xl font-bold text-green-900">{data.date}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Expected Delivery</h4>
              <p className="text-xl font-bold text-blue-900">{data.validUntil || 'TBD'}</p>
            </div>
          </div>
        </div>

        {/* Order Items Table */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <div className="w-6 h-6 bg-green-600 rounded mr-3 flex items-center justify-center">
              <span className="text-white text-sm">✓</span>
            </div>
            ORDERED ITEMS
          </h3>
          
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-800 to-gray-900 text-white">
                <tr>
                  <th className="p-4 text-left font-semibold">#</th>
                  <th className="p-4 text-left font-semibold">Item Description</th>
                  <th className="p-4 text-center font-semibold">Qty</th>
                  <th className="p-4 text-right font-semibold">Unit Price</th>
                  <th className="p-4 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items?.map((item, index) => (
                  <tr key={index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b border-gray-200`}>
                    <td className="p-4 font-semibold text-green-600">{String(index + 1).padStart(2, '0')}</td>
                    <td className="p-4">
                      <div className="font-semibold text-gray-900">{item.description}</div>
                      {item.details && (
                        <div className="text-sm text-gray-600 mt-1">{item.details}</div>
                      )}
                    </td>
                    <td className="p-4 text-center font-medium">{item.quantity}</td>
                    <td className="p-4 text-right font-medium">€{item.unitPrice?.toFixed(2)}</td>
                    <td className="p-4 text-right font-bold text-green-900">
                      €{(item.quantity * item.unitPrice).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Summary */}
        <div className="flex justify-end mb-8">
          <div className="w-96 bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
            <div className="bg-green-600 text-white p-4">
              <h4 className="font-bold text-lg">ORDER SUMMARY</h4>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">€{data.subtotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">VAT ({data.taxRate}%):</span>
                <span className="font-semibold">€{data.taxAmount?.toFixed(2)}</span>
              </div>
              <div className="border-t-2 border-green-600 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-800">Total Amount:</span>
                  <span className="text-2xl font-bold text-green-900">€{data.total?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <h4 className="font-bold text-green-800 mb-4 text-lg">What Happens Next?</h4>
            <ul className="text-green-700 space-y-2">
              <li>• Order processing begins immediately</li>
              <li>• You'll receive tracking information</li>
              <li>• Estimated delivery within 5-7 business days</li>
              <li>• Email notifications for status updates</li>
            </ul>
          </div>
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h4 className="font-bold text-blue-800 mb-4 text-lg">Need Help?</h4>
            <ul className="text-blue-700 space-y-2">
              <li>• Call us: {companySettings?.contactInfo?.phone}</li>
              <li>• Email: {companySettings?.contactInfo?.email}</li>
              <li>• Live chat on our website</li>
              <li>• Order reference: {data.documentNumber}</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-200 pt-6">
          <div className="grid grid-cols-3 gap-8 text-sm text-gray-600">
            <div>
              <h5 className="font-semibold text-gray-800 mb-2">Business Details</h5>
              <p>{companySettings?.taxId}</p>
              <p>VAT: {companySettings?.vatId}</p>
            </div>
            <div>
              <h5 className="font-semibold text-gray-800 mb-2">Banking</h5>
              <p>IBAN: {companySettings?.bankDetails?.iban}</p>
              <p>BIC: {companySettings?.bankDetails?.bic}</p>
            </div>
            <div>
              <h5 className="font-semibold text-gray-800 mb-2">Contact</h5>
              <p>{companySettings?.contactInfo?.phone}</p>
              <p>{companySettings?.contactInfo?.email}</p>
            </div>
          </div>
          
          <div className="text-center mt-6 pt-6 border-t border-gray-200">
            <p className="text-lg font-semibold text-green-800">
              Thank you for choosing our services!
            </p>
            <p className="text-gray-600 mt-1">
              We appreciate your business and look forward to serving you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};