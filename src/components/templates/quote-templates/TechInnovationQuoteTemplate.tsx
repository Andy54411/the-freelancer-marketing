import React from 'react';
import { TemplateProps } from '../types';

export const TechInnovationQuoteTemplate: React.FC<TemplateProps> = ({ 
  data, 
  companySettings,
  customizations 
}) => {
  const logoUrl = companySettings?.logoUrl || customizations?.logoUrl;

  return (
    <div className="max-w-4xl mx-auto bg-gray-50 font-mono">
      {/* Tech Header */}
      <div className="bg-gradient-to-r from-gray-900 via-blue-900 to-cyan-900 text-green-400 p-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="grid grid-cols-20 gap-1 h-full">
            {Array.from({ length: 400 }).map((_, i) => (
              <div key={i} className="bg-green-400 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}></div>
            ))}
          </div>
        </div>
        
        <div className="relative z-10 flex justify-between items-start">
          <div className="flex-1">
            {logoUrl && (
              <div className="bg-gray-900 p-3 rounded border border-green-400 inline-block mb-6">
                <img 
                  src={logoUrl} 
                  alt="Company Logo" 
                  className="h-12 w-auto filter brightness-0 invert"
                />
              </div>
            )}
            <div className="font-mono">
              <h1 className="text-4xl font-bold mb-2 text-green-300">
                <span className="text-cyan-400">[</span> TECH QUOTE <span className="text-cyan-400">]</span>
              </h1>
              <p className="text-xl text-cyan-300">ID: {data.documentNumber}</p>
              <div className="mt-4 p-2 bg-gray-900 border border-green-400 rounded inline-block">
                <p className="text-green-400 text-sm">STATUS: READY_FOR_REVIEW</p>
              </div>
            </div>
          </div>
          <div className="text-right bg-gray-900 border border-green-400 p-6 rounded">
            <h2 className="font-bold text-xl mb-3 text-cyan-400">{companySettings?.companyName}</h2>
            <div className="text-green-300 space-y-1 text-sm font-mono">
              <p>→ {companySettings?.address?.street}</p>
              <p>→ {companySettings?.address?.zipCode} {companySettings?.address?.city}</p>
              <div className="mt-3 pt-3 border-t border-green-400">
                <p>📞 {companySettings?.contactInfo?.phone}</p>
                <p>✉ {companySettings?.contactInfo?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Tech Introduction */}
        <div className="mb-8 bg-gray-900 border border-green-400 rounded p-6">
          <h3 className="text-xl font-bold text-green-400 mb-4 font-mono">
            <span className="text-cyan-400">[</span> SYSTEM_PROPOSAL <span className="text-cyan-400">]</span>
          </h3>
          <div className="bg-gray-800 p-4 rounded border border-gray-600 font-mono text-sm">
            <p className="text-green-300 leading-relaxed">
              <span className="text-cyan-400">$ </span>
              Initializing innovative solution proposal...
              <br />
              <span className="text-cyan-400">$ </span>
              Our cutting-edge technology stack delivers scalable solutions.
              <br />
              <span className="text-cyan-400">$ </span>
              Ready to deploy advanced features and optimize your workflow.
            </p>
          </div>
        </div>

        {/* Client & System Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="bg-gray-900 border border-cyan-400 rounded p-6">
            <h3 className="text-lg font-bold text-cyan-400 mb-4 font-mono">
              [CLIENT_DATA]
            </h3>
            <div className="space-y-3 font-mono">
              <div className="text-green-300">
                <span className="text-gray-400">name:</span> "{data.customerName}"
              </div>
              <div className="text-green-300">
                <span className="text-gray-400">address:</span> "{data.customerAddress?.street}"
              </div>
              <div className="text-green-300">
                <span className="text-gray-400">location:</span> "{data.customerAddress?.zipCode} {data.customerAddress?.city}"
              </div>
              {data.customerContact && (
                <div className="text-green-300 mt-4 pt-4 border-t border-gray-600">
                  <span className="text-gray-400">contact:</span> "{data.customerContact}"
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-blue-900 border border-cyan-400 rounded p-4">
              <h4 className="font-bold text-cyan-300 mb-2 font-mono">[DATE_CREATED]</h4>
              <p className="text-xl font-bold text-white font-mono">{data.date}</p>
            </div>
            <div className="bg-green-900 border border-green-400 rounded p-4">
              <h4 className="font-bold text-green-300 mb-2 font-mono">[EXPIRES]</h4>
              <p className="text-xl font-bold text-white font-mono">{data.validUntil}</p>
            </div>
          </div>
        </div>

        {/* Tech Services */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-green-400 mb-6 font-mono">
            <span className="text-cyan-400">[</span> SERVICE_MODULES <span className="text-cyan-400">]</span>
          </h3>
          
          <div className="space-y-4">
            {data.items?.map((item, index) => (
              <div key={index} className="bg-gray-900 border border-gray-600 rounded p-6 hover:border-green-400 transition-colors">
                <div className="grid grid-cols-12 gap-4 items-center font-mono">
                  <div className="col-span-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded flex items-center justify-center">
                      <span className="text-white font-bold">{(index + 1).toString(16).toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="col-span-7">
                    <h4 className="font-bold text-lg text-green-400 mb-1">{item.description}</h4>
                    {item.details && (
                      <div className="text-gray-400 text-sm bg-gray-800 p-2 rounded mt-2">
                        <span className="text-cyan-400">// </span>{item.details}
                      </div>
                    )}
                  </div>
                  <div className="col-span-1 text-center">
                    <div className="bg-gray-800 border border-gray-600 rounded px-3 py-2">
                      <span className="text-green-400 font-bold">{item.quantity}</span>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-gray-400 text-xs">UNIT_PRICE</p>
                    <p className="font-bold text-lg text-cyan-400">€{item.unitPrice?.toFixed(2)}</p>
                  </div>
                  <div className="col-span-1 text-right">
                    <p className="text-gray-400 text-xs">TOTAL</p>
                    <p className="font-bold text-xl text-green-400">€{(item.quantity * item.unitPrice).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Calculation */}
        <div className="flex justify-end mb-8">
          <div className="w-96 bg-gray-900 border border-green-400 rounded">
            <div className="bg-gradient-to-r from-green-600 to-cyan-600 p-4">
              <h4 className="font-bold text-xl text-white font-mono">[CALCULATION_ENGINE]</h4>
            </div>
            <div className="p-6 space-y-4 font-mono">
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-400">subtotal:</span>
                <span className="text-green-400 font-bold">€{data.subtotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-400">vat_rate:</span>
                <span className="text-cyan-400 font-bold">{data.taxRate}%</span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-400">vat_amount:</span>
                <span className="text-cyan-400 font-bold">€{data.taxAmount?.toFixed(2)}</span>
              </div>
              <div className="border-t-2 border-green-400 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-green-400">total_output:</span>
                  <span className="text-3xl font-bold text-green-300">€{data.total?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tech Footer */}
        <div className="bg-gray-900 border border-green-400 rounded p-8">
          <div className="grid grid-cols-3 gap-8 text-sm font-mono mb-6">
            <div>
              <h5 className="font-bold text-green-400 mb-3">[COMPANY_DATA]</h5>
              <div className="text-gray-400 space-y-1">
                <p>tax_id: {companySettings?.taxId}</p>
                <p>vat_num: {companySettings?.vatId}</p>
              </div>
            </div>
            <div>
              <h5 className="font-bold text-cyan-400 mb-3">[BANK_CONFIG]</h5>
              <div className="text-gray-400 space-y-1">
                <p>iban: {companySettings?.bankDetails?.iban}</p>
                <p>bic: {companySettings?.bankDetails?.bic}</p>
              </div>
            </div>
            <div>
              <h5 className="font-bold text-blue-400 mb-3">[CONNECT]</h5>
              <div className="text-gray-400 space-y-1">
                <p>tel: {companySettings?.contactInfo?.phone}</p>
                <p>mail: {companySettings?.contactInfo?.email}</p>
              </div>
            </div>
          </div>
          
          <div className="text-center border-t border-gray-600 pt-6">
            <div className="bg-gray-800 p-4 rounded border border-gray-600">
              <p className="text-xl font-bold text-green-400 font-mono mb-2">
                <span className="text-cyan-400">[</span> SYSTEM_READY <span className="text-cyan-400">]</span>
              </p>
              <p className="text-gray-400 font-mono text-sm">
                Awaiting deployment confirmation... Let's build the future together!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};