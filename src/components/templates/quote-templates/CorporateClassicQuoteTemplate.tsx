import React from 'react';
import { TemplateProps } from '../types';

export const CorporateClassicQuoteTemplate: React.FC<TemplateProps> = ({ 
  data, 
  companySettings,
  customizations 
}) => {
  const logoUrl = companySettings?.logoUrl || customizations?.logoUrl;

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 font-serif">
      {/* Corporate Header */}
      <div className="border-b-4 border-blue-900 pb-6 mb-8">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {logoUrl && (
              <img 
                src={logoUrl} 
                alt="Company Logo" 
                className="h-16 w-auto mb-6"
              />
            )}
            <h1 className="text-4xl font-bold text-blue-900 mb-2">BUSINESS QUOTATION</h1>
            <p className="text-lg text-blue-700">Reference Number: {data.documentNumber}</p>
          </div>
          <div className="text-right bg-blue-50 p-6 rounded border border-blue-200">
            <h2 className="font-bold text-xl text-blue-900 mb-3">{companySettings?.companyName}</h2>
            <div className="text-blue-800 space-y-1">
              <p>{companySettings?.address?.street}</p>
              <p>{companySettings?.address?.zipCode} {companySettings?.address?.city}</p>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p>Tel: {companySettings?.contactInfo?.phone}</p>
                <p>Email: {companySettings?.contactInfo?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Corporate Introduction */}
      <div className="mb-8 p-6 bg-blue-50 border-l-4 border-blue-600 rounded-r">
        <h3 className="text-xl font-bold text-blue-900 mb-3">Corporate Proposal</h3>
        <p className="text-blue-800 text-lg leading-relaxed">
          We are pleased to submit this comprehensive business proposal for your consideration. 
          Our corporate solutions are designed to meet the highest standards of quality and 
          reliability, ensuring exceptional value for your investment.
        </p>
      </div>

      {/* Client & Quote Information */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-lg font-bold text-blue-900 mb-4 border-b-2 border-blue-200 pb-2">
            CLIENT DETAILS
          </h3>
          <div className="space-y-2">
            <p className="text-xl font-semibold text-gray-900">{data.customerName}</p>
            <p className="text-gray-700">{data.customerAddress?.street}</p>
            <p className="text-gray-700">{data.customerAddress?.zipCode} {data.customerAddress?.city}</p>
            {data.customerContact && (
              <div className="mt-4 pt-4 border-t border-gray-300">
                <p className="text-gray-700 font-medium">
                  <span className="text-blue-700">Contact Person:</span> {data.customerContact}
                </p>
              </div>
            )}
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-bold text-blue-900 mb-4 border-b-2 border-blue-200 pb-2">
            QUOTATION DETAILS
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Quotation Date:</span>
              <span className="font-semibold text-gray-900">{data.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Valid Until:</span>
              <span className="font-semibold text-gray-900">{data.validUntil}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Prepared By:</span>
              <span className="font-semibold text-gray-900">{data.createdBy || 'Corporate Team'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Corporate Services Table */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-blue-900 mb-6">CORPORATE SERVICES & PRICING</h3>
        <table className="w-full border-collapse border-2 border-blue-900">
          <thead>
            <tr className="bg-blue-900 text-white">
              <th className="border border-blue-900 p-4 text-left font-bold">Item</th>
              <th className="border border-blue-900 p-4 text-left font-bold">Service Description</th>
              <th className="border border-blue-900 p-4 text-center font-bold">Quantity</th>
              <th className="border border-blue-900 p-4 text-right font-bold">Unit Rate</th>
              <th className="border border-blue-900 p-4 text-right font-bold">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items?.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-blue-50' : 'bg-white'}>
                <td className="border border-blue-300 p-4 font-semibold text-blue-900">
                  {String(index + 1).padStart(2, '0')}
                </td>
                <td className="border border-blue-300 p-4">
                  <div className="font-semibold text-gray-900">{item.description}</div>
                  {item.details && (
                    <div className="text-sm text-gray-600 mt-1 leading-relaxed">{item.details}</div>
                  )}
                </td>
                <td className="border border-blue-300 p-4 text-center font-medium">{item.quantity}</td>
                <td className="border border-blue-300 p-4 text-right font-medium">€{item.unitPrice?.toFixed(2)}</td>
                <td className="border border-blue-300 p-4 text-right font-bold text-blue-900">
                  €{(item.quantity * item.unitPrice).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Corporate Financial Summary */}
      <div className="flex justify-end mb-8">
        <div className="w-96 border-2 border-blue-900 rounded">
          <div className="bg-blue-900 text-white p-4">
            <h4 className="font-bold text-xl">FINANCIAL SUMMARY</h4>
          </div>
          <div className="p-4 bg-blue-50">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-lg">
                <span className="font-medium text-blue-800">Subtotal:</span>
                <span className="font-semibold">€{data.subtotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="font-medium text-blue-800">VAT ({data.taxRate}%):</span>
                <span className="font-semibold">€{data.taxAmount?.toFixed(2)}</span>
              </div>
              <div className="border-t-2 border-blue-600 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-blue-900">TOTAL:</span>
                  <span className="text-3xl font-bold text-blue-900">€{data.total?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Corporate Terms */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="border border-blue-300 rounded p-6 bg-blue-50">
          <h4 className="font-bold text-blue-900 mb-4 text-lg">TERMS & CONDITIONS</h4>
          <ul className="text-blue-800 space-y-2">
            <li>• Payment Terms: Net 30 days from invoice date</li>
            <li>• Quotation Validity: {data.validUntil}</li>
            <li>• Service Delivery: As per agreed timeline</li>
            <li>• All prices are exclusive of applicable taxes</li>
            <li>• Standard corporate warranty applies</li>
          </ul>
        </div>
        <div className="border border-green-300 rounded p-6 bg-green-50">
          <h4 className="font-bold text-green-800 mb-4 text-lg">CORPORATE BENEFITS</h4>
          <ul className="text-green-700 space-y-2">
            <li>• Dedicated account manager</li>
            <li>• Priority customer support</li>
            <li>• Flexible payment options</li>
            <li>• Quality assurance guarantee</li>
            <li>• Post-delivery support included</li>
          </ul>
        </div>
      </div>

      {/* Corporate Footer */}
      <div className="border-t-4 border-blue-900 pt-6">
        <div className="grid grid-cols-3 gap-8 text-sm text-blue-800 mb-6">
          <div>
            <h5 className="font-bold text-blue-900 mb-3">COMPANY REGISTRATION</h5>
            <p>Tax ID: {companySettings?.taxId}</p>
            <p>VAT Number: {companySettings?.vatId}</p>
            <p>Commercial Register: {companySettings?.commercialRegister}</p>
          </div>
          <div>
            <h5 className="font-bold text-blue-900 mb-3">BANKING DETAILS</h5>
            <p>IBAN: {companySettings?.bankDetails?.iban}</p>
            <p>BIC/SWIFT: {companySettings?.bankDetails?.bic}</p>
            <p>Bank: {companySettings?.bankDetails?.bankName}</p>
          </div>
          <div>
            <h5 className="font-bold text-blue-900 mb-3">CONTACT INFORMATION</h5>
            <p>Phone: {companySettings?.contactInfo?.phone}</p>
            <p>Email: {companySettings?.contactInfo?.email}</p>
            <p>Web: {companySettings?.contactInfo?.website}</p>
          </div>
        </div>
        
        <div className="text-center bg-blue-900 text-white p-6 rounded">
          <p className="text-xl font-bold mb-2">Thank You for Your Business Consideration</p>
          <p className="text-blue-200">
            We appreciate the opportunity to serve your corporate needs
          </p>
        </div>
      </div>
    </div>
  );
};