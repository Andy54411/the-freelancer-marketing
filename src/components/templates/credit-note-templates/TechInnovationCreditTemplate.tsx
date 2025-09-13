import React from 'react';
import { TemplateProps } from '../types';

export const TechInnovationCreditTemplate: React.FC<TemplateProps> = ({ 
  data, 
  companySettings,
  customizations 
}) => {
  const logoUrl = companySettings?.logoUrl || customizations?.logoUrl;

  return (
    <div className="max-w-4xl mx-auto bg-gray-900 text-green-400 font-mono">
      {/* Terminal Credit Header */}
      <div className="bg-black border border-green-500 rounded-t-lg">
        <div className="flex items-center justify-between bg-gray-800 px-4 py-2 rounded-t-lg border-b border-green-500">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <div className="text-green-400 text-sm">credit-note-system.exe</div>
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
                <div className="text-cyan-400 text-sm">$ credit-system --initialize</div>
                <h1 className="text-4xl font-bold text-green-400 tracking-widest">CREDIT [PROCESSED]</h1>
                <div className="text-green-300">
                  <span className="text-cyan-400">{'>'}</span> Status: <span className="text-green-400 font-bold">CREDITED</span>
                </div>
                <div className="text-green-300">
                  <span className="text-cyan-400">{'>'}</span> ID: <span className="text-yellow-400">{data.documentNumber}</span>
                </div>
                <div className="text-green-300">
                  <span className="text-cyan-400">{'>'}</span> Process: <span className="text-green-400 animate-pulse">COMPLETED</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 border border-green-500 p-4 rounded max-w-xs">
              <div className="text-cyan-400 text-sm mb-2">$ system-info --issuer</div>
              <h3 className="text-green-400 font-bold mb-3">{companySettings?.companyName}</h3>
              <div className="text-green-300 space-y-1 text-sm">
                <div>{companySettings?.address?.street}</div>
                <div>{companySettings?.address?.zipCode} {companySettings?.address?.city}</div>
                <div className="border-t border-green-600 mt-2 pt-2">
                  <div>COM: {companySettings?.contactInfo?.phone}</div>
                  <div>NET: {companySettings?.contactInfo?.email}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-black border-x border-green-500 p-6">
        {/* Tech Credit Notice */}
        <div className="mb-8">
          <div className="bg-gray-800 border border-green-600 p-4 rounded">
            <div className="text-cyan-400 text-sm mb-2">$ credit-handler --execute</div>
            <div className="text-green-400 mb-4">
              <span className="text-yellow-400">[INFO]</span> Credit processing protocol initiated...
            </div>
            <div className="bg-gray-900 border-l-4 border-green-500 p-4">
              <div className="text-green-300 leading-relaxed">
                <div className="text-cyan-400 mb-2">// Credit System Status</div>
                <div>Your account credit has been successfully processed and applied.</div>
                <div>All validation checks passed. Credit amount verified and authorized.</div>
                <div>Refund processing initiated through secure payment gateway.</div>
              </div>
            </div>
            <div className="text-green-400 mt-4">
              <span className="text-green-500">[SUCCESS]</span> Credit protocol completed successfully.
            </div>
          </div>
        </div>

        {/* Tech Customer & Credit Info */}
        <div className="grid grid-cols-12 gap-6 mb-8">
          <div className="col-span-8">
            <div className="text-cyan-400 text-sm mb-2">$ client-account --display</div>
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
              <div className="text-cyan-400 text-sm mb-1">$ timestamp --credit</div>
              <div className="text-green-400 text-lg font-bold">{data.date}</div>
            </div>
            {data.validUntil && (
              <div className="bg-gray-800 border border-yellow-500 p-4 rounded">
                <div className="text-yellow-400 text-sm mb-1">$ expiry --credit</div>
                <div className="text-green-400 text-lg font-bold">{data.validUntil}</div>
              </div>
            )}
          </div>
        </div>

        {/* Tech Credit Items */}
        <div className="mb-8">
          <div className="text-cyan-400 text-sm mb-2">$ credit-items --enumerate --detailed</div>
          
          <div className="bg-gray-800 border border-green-600 rounded overflow-hidden">
            <div className="bg-black border-b border-green-600 p-3">
              <div className="grid grid-cols-12 gap-4 text-green-400 font-bold text-sm">
                <div className="col-span-1">PID</div>
                <div className="col-span-6">CREDIT_ITEM</div>
                <div className="col-span-2 text-center">QTY</div>
                <div className="col-span-2 text-right">UNIT_CREDIT</div>
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

        {/* Tech Credit Summary */}
        <div className="flex justify-end mb-8">
          <div className="w-96">
            <div className="text-cyan-400 text-sm mb-2">$ calculate-credit --summary</div>
            <div className="bg-gray-800 border border-green-600 rounded overflow-hidden">
              <div className="bg-black border-b border-green-600 p-3">
                <div className="text-green-400 font-bold">CREDIT_CALCULATOR.exe</div>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-green-300">
                  <span>credit_subtotal:</span>
                  <span className="font-mono">€{data.subtotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-300">
                  <span>vat_credit({data.taxRate}%):</span>
                  <span className="font-mono">€{data.taxAmount?.toFixed(2)}</span>
                </div>
                <div className="border-t border-green-600 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-cyan-400 font-bold">TOTAL_CREDIT:</span>
                    <span className="text-green-400 text-xl font-bold">€{data.total?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tech Credit Process & System Status */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 border border-green-600 p-4 rounded">
            <div className="text-cyan-400 text-sm mb-3">$ credit-pipeline --status</div>
            <div className="space-y-3">
              {[
                { step: 'Credit validation', status: 'COMPLETE', icon: '✓' },
                { step: 'Account adjustment', status: 'COMPLETE', icon: '✓' },
                { step: 'Refund processing', status: 'RUNNING', icon: '▶' },
                { step: 'Notification dispatch', status: 'QUEUED', icon: '⏸' }
              ].map((process, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-yellow-400 mr-2">{process.icon}</span>
                    <span className="text-green-300">{process.step}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    process.status === 'COMPLETE' ? 'bg-green-600 text-black' :
                    process.status === 'RUNNING' ? 'bg-yellow-600 text-black animate-pulse' :
                    'bg-gray-600 text-green-400'
                  }`}>
                    {process.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-gray-800 border border-cyan-500 p-4 rounded">
            <div className="text-cyan-400 text-sm mb-3">$ tech-support --services</div>
            <div className="space-y-3">
              {[
                { service: 'Real-time credit tracking', port: '24/7' },
                { service: 'Automated notifications', port: 'API' },
                { service: 'Secure payment gateway', port: 'SSL' },
                { service: 'Technical support line', port: 'SSH' }
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
        <div className="text-cyan-400 text-sm mb-4">$ system-footer --display --credit-complete</div>
        
        <div className="grid grid-cols-3 gap-6 text-sm mb-6">
          <div className="bg-gray-900 border border-green-600 p-3 rounded">
            <div className="text-green-400 font-bold mb-2">CORP_DATA</div>
            <div className="text-green-300 space-y-1">
              <div>TAX: {companySettings?.taxId}</div>
              <div>VAT: {companySettings?.vatId}</div>
            </div>
          </div>
          <div className="bg-gray-900 border border-cyan-600 p-3 rounded">
            <div className="text-cyan-400 font-bold mb-2">BANK_API</div>
            <div className="text-green-300 space-y-1">
              <div>IBAN: {companySettings?.bankDetails?.iban}</div>
              <div>BIC: {companySettings?.bankDetails?.bic}</div>
            </div>
          </div>
          <div className="bg-gray-900 border border-yellow-600 p-3 rounded">
            <div className="text-yellow-400 font-bold mb-2">COMM_SYS</div>
            <div className="text-green-300 space-y-1">
              <div>TEL: {companySettings?.contactInfo?.phone}</div>
              <div>NET: {companySettings?.contactInfo?.email}</div>
            </div>
          </div>
        </div>
        
        <div className="text-center border-t border-green-600 pt-4">
          <div className="text-green-400 font-bold text-lg mb-2">
            <span className="text-cyan-400">{'>'}</span> TECH CREDIT SYSTEM COMPLETE <span className="text-cyan-400 animate-pulse">█</span>
          </div>
          <div className="text-green-600 text-sm">
            // Advanced credit processing • Secure tech platform • Automated excellence
          </div>
        </div>
      </div>
    </div>
  );
};