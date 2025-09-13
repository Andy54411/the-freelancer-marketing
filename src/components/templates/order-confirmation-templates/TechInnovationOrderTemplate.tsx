import React from 'react';
import { TemplateProps } from '../types';

export const TechInnovationOrderTemplate: React.FC<TemplateProps> = ({ 
  data, 
  companySettings,
  customizations 
}) => {
  const logoUrl = companySettings?.logoUrl || customizations?.logoUrl;

  return (
    <div className="max-w-4xl mx-auto bg-gray-900 text-green-400 font-mono">
      {/* Terminal Header */}
      <div className="bg-black border border-green-500 rounded-t-lg">
        <div className="flex items-center justify-between bg-gray-800 px-4 py-2 rounded-t-lg border-b border-green-500">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <div className="text-green-400 text-sm">order-confirmation.sys</div>
          <div className="text-green-400 text-sm">█</div>
        </div>
        
        <div className="p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {logoUrl && (
                <div className="mb-6 p-2 border border-green-500 inline-block">
                  <img 
                    src={logoUrl} 
                    alt="Company Logo" 
                    className="h-12 w-auto filter invert brightness-0 contrast-100"
                    style={{ filter: 'invert(1) sepia(1) saturate(5) hue-rotate(96deg)' }}
                  />
                </div>
              )}
              <div className="space-y-2">
                <div className="text-cyan-400 text-sm">$ system status --order-confirmation</div>
                <h1 className="text-4xl font-bold text-green-400 tracking-widest">ORDER [CONFIRMED]</h1>
                <div className="text-green-300">
                  <span className="text-cyan-400">{'>'}</span> Status: <span className="text-green-400 font-bold">ACTIVE</span>
                </div>
                <div className="text-green-300">
                  <span className="text-cyan-400">{'>'}</span> ID: <span className="text-yellow-400">{data.documentNumber}</span>
                </div>
                <div className="text-green-300">
                  <span className="text-cyan-400">{'>'}</span> Process: <span className="text-green-400 animate-pulse">RUNNING...</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 border border-green-500 p-4 rounded max-w-xs">
              <div className="text-cyan-400 text-sm mb-2">$ whoami --company</div>
              <h3 className="text-green-400 font-bold mb-3">{companySettings?.companyName}</h3>
              <div className="text-green-300 space-y-1 text-sm">
                <div>{companySettings?.address?.street}</div>
                <div>{companySettings?.address?.zipCode} {companySettings?.address?.city}</div>
                <div className="border-t border-green-600 mt-2 pt-2">
                  <div>Tel: {companySettings?.contactInfo?.phone}</div>
                  <div>Email: {companySettings?.contactInfo?.email}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-black border-x border-green-500 p-6">
        {/* Terminal Confirmation */}
        <div className="mb-8">
          <div className="bg-gray-900 border border-green-600 p-4 rounded">
            <div className="text-cyan-400 text-sm mb-2">$ confirmation-handler --execute</div>
            <div className="text-green-400 mb-4">
              <span className="text-yellow-400">[INFO]</span> Order confirmation protocol initiated...
            </div>
            <div className="bg-gray-800 border-l-4 border-green-500 p-4">
              <div className="text-green-300 leading-relaxed">
                <div className="text-cyan-400 mb-2">// Order Processing Status</div>
                <div>Your technical order has been successfully validated and queued for execution.</div>
                <div>All system checks passed. Initiating production pipeline...</div>
              </div>
            </div>
            <div className="text-green-400 mt-4">
              <span className="text-green-500">[SUCCESS]</span> Confirmation protocol completed.
            </div>
          </div>
        </div>

        {/* Tech Customer & Order Info */}
        <div className="grid grid-cols-12 gap-6 mb-8">
          <div className="col-span-8">
            <div className="text-cyan-400 text-sm mb-2">$ client-info --display</div>
            <div className="bg-gray-800 border border-green-600 p-4 rounded">
              <div className="space-y-3">
                <div className="text-green-400 text-xl font-bold">
                  <span className="text-cyan-400">{'>'}</span> {data.customerName}
                </div>
                <div className="text-green-300 space-y-1">
                  <div className="flex"><span className="text-cyan-400 w-20">Address:</span> {data.customerAddress?.street}</div>
                  <div className="flex"><span className="text-cyan-400 w-20">Location:</span> {data.customerAddress?.zipCode} {data.customerAddress?.city}</div>
                </div>
                {data.customerContact && (
                  <div className="border-t border-green-700 pt-3 mt-3">
                    <div className="flex"><span className="text-cyan-400 w-20">Contact:</span> {data.customerContact}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="col-span-4 space-y-4">
            <div className="bg-gray-800 border border-cyan-500 p-4 rounded">
              <div className="text-cyan-400 text-sm mb-1">$ date --order</div>
              <div className="text-green-400 text-lg font-bold">{data.date}</div>
            </div>
            {data.validUntil && (
              <div className="bg-gray-800 border border-yellow-500 p-4 rounded">
                <div className="text-yellow-400 text-sm mb-1">$ eta --delivery</div>
                <div className="text-green-400 text-lg font-bold">{data.validUntil}</div>
              </div>
            )}
          </div>
        </div>

        {/* Tech Order Items */}
        <div className="mb-8">
          <div className="text-cyan-400 text-sm mb-2">$ order-items --list --verbose</div>
          
          <div className="bg-gray-800 border border-green-600 rounded overflow-hidden">
            <div className="bg-black border-b border-green-600 p-3">
              <div className="grid grid-cols-12 gap-4 text-green-400 font-bold text-sm">
                <div className="col-span-1">PID</div>
                <div className="col-span-6">PROCESS_NAME</div>
                <div className="col-span-2 text-center">COUNT</div>
                <div className="col-span-2 text-right">UNIT_COST</div>
                <div className="col-span-1 text-right">TOTAL</div>
              </div>
            </div>
            
            {data.items?.map((item, index) => (
              <div key={index} className={`p-3 border-b border-green-700 last:border-b-0 ${index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}`}>
                <div className="grid grid-cols-12 gap-4 items-center text-sm">
                  <div className="col-span-1">
                    <div className="text-yellow-400 font-bold">
                      {String(index + 1).padStart(3, '0')}
                    </div>
                  </div>
                  <div className="col-span-6">
                    <div className="text-green-400 font-bold mb-1">{item.description}</div>
                    {item.details && (
                      <div className="text-green-600 text-xs">// {item.details}</div>
                    )}
                  </div>
                  <div className="col-span-2 text-center">
                    <div className="bg-black border border-green-600 px-2 py-1 rounded text-green-400">
                      {item.quantity}
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <div className="text-cyan-400">€{item.unitPrice?.toFixed(2)}</div>
                  </div>
                  <div className="col-span-1 text-right">
                    <div className="text-green-400 font-bold">€{(item.quantity * item.unitPrice).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Order Summary */}
        <div className="flex justify-end mb-8">
          <div className="w-96">
            <div className="text-cyan-400 text-sm mb-2">$ calculate-total --summary</div>
            <div className="bg-gray-800 border border-green-600 rounded overflow-hidden">
              <div className="bg-black border-b border-green-600 p-3">
                <div className="text-green-400 font-bold">FINANCIAL_SUMMARY.exe</div>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-green-300">
                  <span>subtotal:</span>
                  <span className="font-mono">€{data.subtotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-300">
                  <span>vat_rate({data.taxRate}%):</span>
                  <span className="font-mono">€{data.taxAmount?.toFixed(2)}</span>
                </div>
                <div className="border-t border-green-600 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-cyan-400 font-bold">TOTAL_AMOUNT:</span>
                    <span className="text-green-400 text-xl font-bold">€{data.total?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tech Process & Support */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 border border-green-600 p-4 rounded">
            <div className="text-cyan-400 text-sm mb-3">$ process-pipeline --status</div>
            <div className="space-y-3">
              {[
                { step: 'Order validation', status: 'COMPLETE', icon: '✓' },
                { step: 'Resource allocation', status: 'RUNNING', icon: '▶' },
                { step: 'Quality assurance', status: 'PENDING', icon: '⏳' },
                { step: 'Deployment ready', status: 'QUEUED', icon: '⏸' }
              ].map((process, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-yellow-400 mr-2">{process.icon}</span>
                    <span className="text-green-300">{process.step}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    process.status === 'COMPLETE' ? 'bg-green-600 text-black' :
                    process.status === 'RUNNING' ? 'bg-yellow-600 text-black animate-pulse' :
                    process.status === 'PENDING' ? 'bg-orange-600 text-black' :
                    'bg-gray-600 text-green-400'
                  }`}>
                    {process.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-gray-800 border border-cyan-500 p-4 rounded">
            <div className="text-cyan-400 text-sm mb-3">$ support-systems --available</div>
            <div className="space-y-3">
              {[
                { service: 'Real-time monitoring', port: '24/7' },
                { service: 'Technical hotline', port: 'SSH' },
                { service: 'System diagnostics', port: 'API' },
                { service: 'Remote assistance', port: 'VPN' }
              ].map((service, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="text-green-300">{service.service}</div>
                  <div className="text-cyan-400 text-xs bg-black border border-cyan-600 px-2 py-1 rounded">
                    {service.port}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tech Footer */}
      <div className="bg-black border border-green-500 rounded-b-lg p-6">
        <div className="text-cyan-400 text-sm mb-4">$ system-info --company --banking --contact</div>
        
        <div className="grid grid-cols-3 gap-6 text-sm mb-6">
          <div className="bg-gray-900 border border-green-600 p-3 rounded">
            <div className="text-green-400 font-bold mb-2">SYSTEM_INFO</div>
            <div className="text-green-300 space-y-1">
              <div>TAX_ID: {companySettings?.taxId}</div>
              <div>VAT_ID: {companySettings?.vatId}</div>
            </div>
          </div>
          <div className="bg-gray-900 border border-cyan-600 p-3 rounded">
            <div className="text-cyan-400 font-bold mb-2">BANK_CONFIG</div>
            <div className="text-green-300 space-y-1">
              <div>IBAN: {companySettings?.bankDetails?.iban}</div>
              <div>BIC: {companySettings?.bankDetails?.bic}</div>
            </div>
          </div>
          <div className="bg-gray-900 border border-yellow-600 p-3 rounded">
            <div className="text-yellow-400 font-bold mb-2">CONTACT_API</div>
            <div className="text-green-300 space-y-1">
              <div>TEL: {companySettings?.contactInfo?.phone}</div>
              <div>MAIL: {companySettings?.contactInfo?.email}</div>
            </div>
          </div>
        </div>
        
        <div className="text-center border-t border-green-600 pt-4">
          <div className="text-green-400 font-bold text-lg mb-2">
            <span className="text-cyan-400">{'>'}</span> TECH ORDER CONFIRMED <span className="text-cyan-400 animate-pulse">█</span>
          </div>
          <div className="text-green-600 text-sm">
            // Thank you for choosing our advanced technical solutions
          </div>
        </div>
      </div>
    </div>
  );
};