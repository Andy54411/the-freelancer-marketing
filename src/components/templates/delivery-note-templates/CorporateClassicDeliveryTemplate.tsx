import React from 'react';
import type { TemplateProps } from '../types';
import { resolveLogoUrl } from '../utils/logoUtils';

export const CorporateClassicDeliveryTemplate: React.FC<TemplateProps> = ({
  data,
  companySettings,
  customizations
}) => {
  const logoUrl = resolveLogoUrl(customizations, companySettings, data);

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 border border-gray-200">
      {/* Corporate Header */}
      <div className="bg-gray-800 text-white p-6 mb-8 -m-8 mb-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-6">
            {logoUrl && (
              <div className="bg-white p-2 rounded">
                <img 
                  src={logoUrl} 
                  alt="Company Logo" 
                  className="h-12 w-12 object-contain"
                />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">LIEFERSCHEIN</h1>
              <div className="text-gray-200 font-medium text-sm">DELIVERY NOTE</div>
            </div>
          </div>
          <div className="text-right bg-gray-700 p-4 rounded">
            <div className="text-xl font-bold">#{data.documentNumber}</div>
            <div className="text-gray-200 text-sm">{data.date}</div>
          </div>
        </div>
      </div>

      {/* Corporate Information Section */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Company Information */}
        <div className="border border-gray-300 p-6">
          <div className="bg-gray-100 px-3 py-2 border-b border-gray-300 mb-4">
            <h3 className="font-bold text-gray-800">LIEFERANT</h3>
          </div>
          <div className="space-y-2 text-gray-700">
            <div className="font-bold">{companySettings?.companyName}</div>
            {companySettings?.address && (
              <>
                <div>{companySettings.address.street}</div>
                <div>{companySettings.address.zipCode} {companySettings.address.city}</div>
              </>
            )}
            <div className="pt-3 space-y-1 text-sm">
              {companySettings?.contactInfo?.phone && (
                <div><span className="font-medium">Tel:</span> {companySettings.contactInfo.phone}</div>
              )}
              {companySettings?.contactInfo?.email && (
                <div><span className="font-medium">Email:</span> {companySettings.contactInfo.email}</div>
              )}
              {companySettings?.taxId && (
                <div><span className="font-medium">Steuer-Nr:</span> {companySettings.taxId}</div>
              )}
              {companySettings?.vatId && (
                <div><span className="font-medium">USt-IdNr:</span> {companySettings.vatId}</div>
              )}
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="border border-gray-300 p-6">
          <div className="bg-gray-100 px-3 py-2 border-b border-gray-300 mb-4">
            <h3 className="font-bold text-gray-800">EMPFÄNGER</h3>
          </div>
          <div className="space-y-2 text-gray-700">
            <div className="font-bold">{data.customerName}</div>
            {data.customerAddress && (
              <div className="whitespace-pre-line">
                {typeof data.customerAddress === 'string' 
                  ? data.customerAddress 
                  : `${data.customerAddress.street}\n${data.customerAddress.zipCode} ${data.customerAddress.city}`
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Corporate Delivery Details */}
      <div className="border border-gray-300 mb-8">
        <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
          <h3 className="font-bold text-gray-800">LIEFERINFORMATIONEN</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="font-bold text-gray-700 text-sm uppercase">Lieferdatum</div>
              <div className="font-medium text-gray-800 mt-1">{data.date}</div>
            </div>
            {data.validUntil && (
              <div>
                <div className="font-bold text-gray-700 text-sm uppercase">Gewünschter Termin</div>
                <div className="font-medium text-gray-800 mt-1">{data.validUntil}</div>
              </div>
            )}
            {data.createdBy && (
              <div>
                <div className="font-bold text-gray-700 text-sm uppercase">Bearbeitet von</div>
                <div className="font-medium text-gray-800 mt-1">{data.createdBy}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Corporate Items Table */}
      {data.items && data.items.length > 0 && (
        <div className="border border-gray-300 mb-8">
          <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
            <h3 className="font-bold text-gray-800">LIEFERUMFANG</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-300">
                <th className="px-4 py-3 text-left font-bold text-gray-700 border-r border-gray-300">
                  ARTIKEL
                </th>
                <th className="px-4 py-3 text-center font-bold text-gray-700 border-r border-gray-300">
                  MENGE
                </th>
                <th className="px-4 py-3 text-center font-bold text-gray-700 border-r border-gray-300">
                  EINHEIT
                </th>
                <th className="px-4 py-3 text-center font-bold text-gray-700">
                  STATUS
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-4 border-r border-gray-200">
                    <div className="font-medium text-gray-800">{item.description}</div>
                    {item.details && (
                      <div className="text-sm text-gray-600 mt-1">{item.details}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center font-bold text-gray-800 border-r border-gray-200">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-4 text-center text-gray-700 border-r border-gray-200">
                    {item.unit || 'Stk.'}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-xs font-bold text-gray-700">
                      GELIEFERT
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Corporate Signature Section */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="border border-gray-300">
          <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
            <h4 className="font-bold text-gray-800">LIEFERANT-BESTÄTIGUNG</h4>
          </div>
          <div className="p-6">
            <div className="h-16 mb-4"></div>
            <div className="border-b-2 border-gray-500 mb-3"></div>
            <div className="text-sm text-gray-700 space-y-1">
              <div className="font-medium">Unterschrift, Firmenstempel</div>
              <div>Name: _________________________</div>
              <div>Datum: _______________________</div>
            </div>
          </div>
        </div>
        <div className="border border-gray-300">
          <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
            <h4 className="font-bold text-gray-800">EMPFÄNGER-BESTÄTIGUNG</h4>
          </div>
          <div className="p-6">
            <div className="h-16 mb-4"></div>
            <div className="border-b-2 border-gray-500 mb-3"></div>
            <div className="text-sm text-gray-700 space-y-1">
              <div className="font-medium">Unterschrift des Empfängers</div>
              <div>Name: _________________________</div>
              <div>Datum: _______________________</div>
            </div>
          </div>
        </div>
      </div>

      {/* Corporate Notes */}
      {data.notes && (
        <div className="border border-gray-300 mb-6">
          <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
            <h3 className="font-bold text-gray-800">BEMERKUNGEN</h3>
          </div>
          <div className="p-6">
            <div className="text-gray-700 leading-relaxed">{data.notes}</div>
          </div>
        </div>
      )}

      {/* Corporate Footer */}
      <div className="border-t-2 border-gray-400 pt-6">
        <div className="text-center">
          <div className="font-bold text-gray-800 mb-3">
            LIEFERBESTÄTIGUNG
          </div>
          <div className="text-sm text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Mit der Unterschrift bestätigt der Empfänger den ordnungsgemäßen Erhalt der oben aufgeführten Artikel 
            in einwandfreiem Zustand. Diese Lieferbestätigung dient als Nachweis der vollständigen und sachgemäßen Lieferung.
          </div>
        </div>
      </div>
    </div>
  );
};