import React from 'react';
import type { TemplateProps } from '../types';
import { resolveLogoUrl } from '../utils/logoUtils';

export const ExecutivePremiumDeliveryTemplate: React.FC<TemplateProps> = ({
  data,
  companySettings,
  customizations
}) => {
  const logoUrl = resolveLogoUrl(customizations, companySettings, data);

  return (
    <div className="max-w-4xl mx-auto bg-white p-8">
      {/* Executive Header */}
      <div className="mb-10 pb-6 border-b-2 border-gray-800">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-6">
            {logoUrl && (
              <img 
                src={logoUrl} 
                alt="Company Logo" 
                className="h-16 w-16 object-contain"
              />
            )}
            <div>
              <h1 className="text-3xl font-light text-gray-800 tracking-wide">
                LIEFERSCHEIN
              </h1>
              <div className="text-gray-600 font-light text-sm mt-1 uppercase tracking-widest">
                Delivery Documentation
              </div>
            </div>
          </div>
          <div className="text-right border border-gray-300 p-4">
            <div className="text-2xl font-light text-gray-800">#{data.documentNumber}</div>
            <div className="text-gray-600 mt-1 text-sm">{data.date}</div>
          </div>
        </div>
      </div>

      {/* Executive Company and Customer Section */}
      <div className="grid grid-cols-2 gap-12 mb-10">
        {/* Company Info */}
        <div className="border-l-4 border-gray-800 pl-6">
          <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-4">Absender</h3>
          <div className="space-y-2 text-gray-700">
            <div className="text-lg font-light">{companySettings?.companyName}</div>
            {companySettings?.address && (
              <>
                <div className="text-gray-600">{companySettings.address.street}</div>
                <div className="text-gray-600">
                  {companySettings.address.zipCode} {companySettings.address.city}
                </div>
              </>
            )}
            <div className="pt-3 space-y-1 text-sm text-gray-600">
              {companySettings?.contactInfo?.phone && (
                <div>T: {companySettings.contactInfo.phone}</div>
              )}
              {companySettings?.contactInfo?.email && (
                <div>E: {companySettings.contactInfo.email}</div>
              )}
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="border-l-4 border-gray-400 pl-6">
          <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-4">Empfänger</h3>
          <div className="space-y-2 text-gray-700">
            <div className="text-lg font-light">{data.customerName}</div>
            {data.customerAddress && (
              <div className="text-gray-600 whitespace-pre-line">
                {typeof data.customerAddress === 'string' 
                  ? data.customerAddress 
                  : `${data.customerAddress.street}\n${data.customerAddress.zipCode} ${data.customerAddress.city}`
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Executive Delivery Information */}
      <div className="bg-gray-50 border border-gray-200 p-6 mb-8">
        <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-6">Lieferinformationen</h3>
        <div className="grid grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Lieferdatum</div>
            <div className="text-lg font-light text-gray-800 mt-1">{data.date}</div>
          </div>
          {data.validUntil && (
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Gewünschter Termin</div>
              <div className="text-lg font-light text-gray-800 mt-1">{data.validUntil}</div>
            </div>
          )}
          {data.createdBy && (
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Bearbeitung</div>
              <div className="text-lg font-light text-gray-800 mt-1">{data.createdBy}</div>
            </div>
          )}
        </div>
      </div>

      {/* Executive Items Table */}
      {data.items && data.items.length > 0 && (
        <div className="mb-10">
          <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-6">Lieferumfang</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-800">
                <th className="px-4 py-3 text-left text-xs font-medium tracking-widest text-gray-700 uppercase">Artikel</th>
                <th className="px-4 py-3 text-center text-xs font-medium tracking-widest text-gray-700 uppercase">Menge</th>
                <th className="px-4 py-3 text-center text-xs font-medium tracking-widest text-gray-700 uppercase">Einheit</th>
                <th className="px-4 py-3 text-center text-xs font-medium tracking-widest text-gray-700 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="font-light text-gray-800">{item.description}</div>
                    {item.details && (
                      <div className="text-sm text-gray-600 mt-1">{item.details}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center font-light text-gray-800">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-4 text-center text-gray-600">
                    {item.unit || 'Stk.'}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-xs font-medium text-gray-700">
                      Geliefert
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Executive Signature Section */}
      <div className="grid grid-cols-2 gap-12 mb-8">
        <div className="border border-gray-200 p-6">
          <h4 className="text-xs uppercase tracking-widest text-gray-500 mb-6">
            Lieferant-Bestätigung
          </h4>
          <div className="h-20 mb-4"></div>
          <div className="border-b border-gray-400 mb-3"></div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Unterschrift, Stempel</div>
            <div>Datum: ________________</div>
          </div>
        </div>
        <div className="border border-gray-200 p-6">
          <h4 className="text-xs uppercase tracking-widest text-gray-500 mb-6">
            Empfänger-Bestätigung
          </h4>
          <div className="h-20 mb-4"></div>
          <div className="border-b border-gray-400 mb-3"></div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Unterschrift, Name</div>
            <div>Datum: ________________</div>
          </div>
        </div>
      </div>

      {/* Executive Notes */}
      {data.notes && (
        <div className="mb-6">
          <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-4">Zusätzliche Informationen</h3>
          <div className="bg-gray-50 border border-gray-200 p-6">
            <div className="text-gray-700 font-light leading-relaxed">{data.notes}</div>
          </div>
        </div>
      )}

      {/* Executive Footer */}
      <div className="mt-10 pt-6 border-t border-gray-300">
        <div className="text-center">
          <div className="text-gray-600 font-light text-sm mb-2">
            Lieferbestätigung
          </div>
          <div className="text-xs text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Die oben aufgeführten Artikel wurden in einwandfreiem Zustand übergeben und ordnungsgemäß empfangen. 
            Diese Bestätigung dient als Nachweis der vollständigen Lieferung.
          </div>
        </div>
      </div>
    </div>
  );
};