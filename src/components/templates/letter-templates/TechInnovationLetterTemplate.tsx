import React from 'react';
import { TemplateProps } from '../types';

export const TechInnovationLetterTemplate: React.FC<TemplateProps> = ({ 
  data, 
  companySettings,
  customizations 
}) => {
  const logoUrl = companySettings?.logoUrl || customizations?.logoUrl;

  return (
    <div className="max-w-4xl mx-auto bg-gray-900 text-green-400 font-mono">
      {/* Terminal Letter Header */}
      <div className="bg-black border border-green-500 rounded-t-lg">
        <div className="flex items-center justify-between bg-gray-800 px-4 py-2 rounded-t-lg border-b border-green-500">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <div className="text-green-400 text-sm">tech-correspondence.sys</div>
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
                <div className="text-cyan-400 text-sm">$ init --correspondence-protocol</div>
                <h1 className="text-4xl font-bold text-green-400 tracking-widest">TECH [LETTER]</h1>
                <div className="text-green-300">
                  <span className="text-cyan-400">{'>'}</span> Protocol: <span className="text-green-400 font-bold">ACTIVE</span>
                </div>
                <div className="text-green-300">
                  <span className="text-cyan-400">{'>'}</span> Channel: <span className="text-yellow-400">SECURE</span>
                </div>
                <div className="text-green-300">
                  <span className="text-cyan-400">{'>'}</span> Status: <span className="text-green-400 animate-pulse">TRANSMITTING...</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 border border-green-500 p-4 rounded max-w-xs">
              <div className="text-cyan-400 text-sm mb-2">$ system-info --sender</div>
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
        {/* Tech Letter Details */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <div className="text-cyan-400 text-sm mb-2">$ recipient-data --display</div>
            <div className="bg-gray-800 border border-green-600 p-4 rounded">
              <div className="space-y-3">
                <div className="text-green-400 text-xl font-bold">
                  <span className="text-cyan-400">{'>'}</span> {data.customerName}
                </div>
                <div className="text-green-300 space-y-1">
                  <div className="flex"><span className="text-cyan-400 w-20">LOC:</span> {data.customerAddress?.street}</div>
                  <div className="flex"><span className="text-cyan-400 w-20">ZONE:</span> {data.customerAddress?.zipCode} {data.customerAddress?.city}</div>
                </div>
                {data.customerContact && (
                  <div className="border-t border-green-700 pt-3 mt-3">
                    <div className="flex"><span className="text-cyan-400 w-20">USER:</span> {data.customerContact}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gray-800 border border-cyan-500 p-4 rounded">
              <div className="text-cyan-400 text-sm mb-1">$ doc-id --ref</div>
              <div className="text-green-400 text-lg font-bold">{data.documentNumber}</div>
            </div>
            <div className="bg-gray-800 border border-green-500 p-4 rounded">
              <div className="text-green-400 text-sm mb-1">$ timestamp --current</div>
              <div className="text-green-400 text-lg font-bold">{data.date}</div>
            </div>
            {data.validUntil && (
              <div className="bg-gray-800 border border-yellow-500 p-4 rounded">
                <div className="text-yellow-400 text-sm mb-1">$ deadline --response</div>
                <div className="text-green-400 text-lg font-bold">{data.validUntil}</div>
              </div>
            )}
          </div>
        </div>

        {/* Tech Subject */}
        <div className="mb-8">
          <div className="text-cyan-400 text-sm mb-2">$ subject-line --initialize</div>
          <div className="bg-gray-800 border border-green-600 p-4 rounded">
            <div className="text-green-400 mb-4">
              <span className="text-yellow-400">[SUBJECT]</span> Tech Communication Protocol Initiated
            </div>
            <div className="bg-gray-900 border-l-4 border-green-500 p-4">
              <div className="text-green-300">
                <div className="text-cyan-400 mb-2">// Technical Business Correspondence</div>
                <div>Advanced digital communication channel established for technical discourse.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tech Letter Body */}
        <div className="mb-8">
          <div className="text-cyan-400 text-sm mb-2">$ message-body --compose --secure</div>
          
          <div className="bg-gray-800 border border-green-600 rounded overflow-hidden">
            <div className="bg-black border-b border-green-600 p-3">
              <div className="text-green-400 font-bold">TECH_COMMUNICATION.exe</div>
            </div>
            
            <div className="p-6">
              <div className="text-green-400 mb-6">
                <span className="text-cyan-400">{'>'}</span> Greetings, {data.customerName?.split(' ')[0] || 'Tech User'}
              </div>
              
              <div className="space-y-6 text-green-300 leading-relaxed">
                <div>
                  <div className="text-cyan-400 text-sm mb-2">// Initialization sequence</div>
                  <p>
                    Connection established successfully. We are transmitting this technical 
                    correspondence through our secure digital communication protocol to share 
                    important system information and updates regarding our collaborative 
                    technology initiatives.
                  </p>
                </div>
                
                <div>
                  <div className="text-cyan-400 text-sm mb-2">// Protocol verification</div>
                  <p>
                    Your system has been identified as a compatible node in our technology 
                    network. This communication contains critical data packets that require 
                    your processing and acknowledgment to maintain optimal network performance 
                    and collaborative functionality.
                  </p>
                </div>

                {data.items && data.items.length > 0 && (
                  <div className="my-8">
                    <div className="text-cyan-400 text-sm mb-3">$ data-packets --enumerate</div>
                    
                    <div className="bg-gray-900 border border-green-600 rounded overflow-hidden">
                      <div className="bg-black border-b border-green-600 p-3">
                        <div className="grid grid-cols-12 gap-4 text-green-400 font-bold text-sm">
                          <div className="col-span-1">PID</div>
                          <div className="col-span-8">DATA_PACKET</div>
                          <div className="col-span-3">STATUS</div>
                        </div>
                      </div>
                      
                      {data.items.map((item, index) => (
                        <div key={index} className={`p-3 border-b border-green-700 last:border-b-0 ${index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}`}>
                          <div className="grid grid-cols-12 gap-4 items-center text-sm">
                            <div className="col-span-1">
                              <div className="text-yellow-400 font-bold">
                                {String(index + 1).padStart(3, '0')}
                              </div>
                            </div>
                            <div className="col-span-8">
                              <div className="text-green-400 font-bold mb-1">{item.description}</div>
                              {item.details && (
                                <div className="text-green-600 text-xs">// {item.details}</div>
                              )}
                            </div>
                            <div className="col-span-3">
                              <div className="bg-green-600 text-black px-2 py-1 rounded text-xs">
                                READY
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-cyan-400 text-sm mb-2">// System optimization</div>
                  <p>
                    Our advanced algorithms have processed your requirements and optimized 
                    the workflow for maximum efficiency. All systems are operating within 
                    normal parameters and ready for the next phase of our technological 
                    collaboration.
                  </p>
                </div>

                <div>
                  <div className="text-cyan-400 text-sm mb-2">// Next steps protocol</div>
                  <p>
                    Please acknowledge receipt of this communication by responding through 
                    our secure channels. Our technical support systems remain on standby 
                    to assist with any queries or additional data processing requirements. 
                    Stay connected! 🚀
                  </p>
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-green-600">
                <div className="text-green-400 mb-8">
                  <span className="text-cyan-400">{'>'}</span> End transmission protocol...
                </div>
                <div className="space-y-3">
                  <div className="h-16 border-b border-green-500 w-80"></div>
                  <div className="text-green-400 font-bold">{companySettings?.companyName}</div>
                  <div className="text-cyan-400 text-sm">TECH_INNOVATION_DEPT</div>
                  <div className="text-green-600 text-xs">// Secure digital correspondence system</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tech Financial Summary */}
        {data.total && (
          <div className="mb-8">
            <div className="text-cyan-400 text-sm mb-2">$ financial-data --calculate --display</div>
            <div className="bg-gray-800 border border-green-600 rounded overflow-hidden">
              <div className="bg-black border-b border-green-600 p-3">
                <div className="text-green-400 font-bold">FINANCIAL_CALC.exe</div>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-green-300">
                  <span>subtotal_amount:</span>
                  <span className="font-mono">€{data.subtotal?.toFixed(2)}</span>
                </div>
                <div className="border-t border-green-600 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-cyan-400 font-bold">TOTAL_COMPUTED:</span>
                    <span className="text-green-400 text-xl font-bold">€{data.total?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tech Footer */}
      <div className="bg-black border border-green-500 rounded-b-lg p-6">
        <div className="text-cyan-400 text-sm mb-4">$ system-footer --display --company-data</div>
        
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
            <span className="text-cyan-400">{'>'}</span> TECH CORRESPONDENCE PROTOCOL COMPLETE <span className="text-cyan-400 animate-pulse">█</span>
          </div>
          <div className="text-green-600 text-sm">
            // Advanced digital communication • Secure technology network
          </div>
        </div>
      </div>
    </div>
  );
};