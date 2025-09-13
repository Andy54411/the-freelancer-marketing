import React from 'react';
import type { TemplateProps } from '../types';
import { resolveLogoUrl } from '../utils/logoUtils';

export const CreativeModernDeliveryTemplate: React.FC<TemplateProps> = ({
  data,
  companySettings,
  customizations,
}) => {
  const logoUrl = resolveLogoUrl(customizations, companySettings, data);

  return (
    <div className="max-w-4xl mx-auto bg-white p-8">
      {/* Modern Header */}
      <div className="mb-10 pb-6 border-b border-gray-300">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-6">
            {logoUrl && (
              <div className="border-2 border-gray-300 p-2 rounded-lg">
                <img src={logoUrl} alt="Company Logo" className="h-14 w-14 object-contain" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-800">LIEFERSCHEIN</h1>
              <div className="text-gray-600 font-medium text-sm mt-1">Delivery Documentation</div>
            </div>
          </div>
          <div className="text-right bg-gray-100 border border-gray-300 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-800">#{data.documentNumber}</div>
            <div className="text-gray-600 mt-1 font-medium">{data.date}</div>
          </div>
        </div>
      </div>

      {/* Modern Company and Customer Cards */}
      <div className="grid grid-cols-2 gap-8 mb-10">
        {/* Company Card */}
        <div className="border-2 border-gray-300 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
            Von uns
          </h3>
          <div className="space-y-2">
            <div className="text-lg font-semibold text-gray-800">
              {companySettings?.companyName}
            </div>
            {companySettings?.address && (
              <>
                <div className="text-gray-600">{companySettings.address.street}</div>
                <div className="text-gray-600">
                  {companySettings.address.zipCode} {companySettings.address.city}
                </div>
              </>
            )}
            {companySettings?.contactInfo?.phone && (
              <div className="text-gray-600">Tel: {companySettings.contactInfo.phone}</div>
            )}
            {companySettings?.contactInfo?.email && (
              <div className="text-gray-600">E-Mail: {companySettings.contactInfo.email}</div>
            )}
          </div>
        </div>

        {/* Customer Card */}
        <div className="border-2 border-gray-300 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
            An Sie
          </h3>
          <div className="space-y-2">
            <div className="text-lg font-semibold text-gray-800">{data.customerName}</div>
            {data.customerAddress && (
              <div className="text-gray-600 whitespace-pre-line">
                {typeof data.customerAddress === 'string'
                  ? data.customerAddress
                  : `${data.customerAddress.street}\n${data.customerAddress.zipCode} ${data.customerAddress.city}`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modern Delivery Info Section */}
      <div className="bg-gray-50 border border-gray-300 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-6 pb-2 border-b border-gray-300">
          Lieferdetails
        </h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">
              Lieferdatum
            </div>
            <div className="text-lg font-bold text-gray-800 mt-1">{data.date}</div>
          </div>
          {data.validUntil && (
            <div className="text-center bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                Gewünschter Termin
              </div>
              <div className="text-lg font-bold text-gray-800 mt-1">{data.validUntil}</div>
            </div>
          )}
          {data.createdBy && (
            <div className="text-center bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                Bearbeitung
              </div>
              <div className="text-lg font-bold text-gray-800 mt-1">{data.createdBy}</div>
            </div>
          )}
        </div>
      </div>

      {/* Modern Items List */}
      {data.items && data.items.length > 0 && (
        <div className="mb-10">
          <h3 className="text-lg font-bold text-gray-800 mb-6 pb-2 border-b border-gray-300">
            Gelieferte Artikel
          </h3>
          <div className="space-y-4">
            {data.items.map((item, index) => (
              <div
                key={index}
                className="bg-gray-50 border border-gray-300 rounded-lg p-6 hover:shadow-sm transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-gray-800 mb-2">{item.description}</h4>
                    {item.details && <div className="text-gray-600">{item.details}</div>}
                  </div>
                  <div className="flex items-center space-x-6 ml-6">
                    <div className="text-center bg-white rounded-lg p-3 border border-gray-200">
                      <div className="text-2xl font-bold text-gray-800">{item.quantity}</div>
                      <div className="text-sm text-gray-600">{item.unit || 'Stk.'}</div>
                    </div>
                    <div className="text-center">
                      <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300">
                        Geliefert
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modern Signature Section */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="bg-gray-50 border border-gray-300 rounded-lg p-6">
          <h4 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-300">
            Lieferant
          </h4>
          <div className="h-20 mb-4 bg-white rounded-lg border border-gray-200"></div>
          <div className="border-b-2 border-gray-400 mb-3"></div>
          <div className="text-sm text-gray-600 space-y-1">
            <div className="font-medium">Unterschrift & Stempel</div>
            <div>Datum: ________________</div>
          </div>
        </div>
        <div className="bg-gray-50 border border-gray-300 rounded-lg p-6">
          <h4 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-300">
            Empfänger
          </h4>
          <div className="h-20 mb-4 bg-white rounded-lg border border-gray-200"></div>
          <div className="border-b-2 border-gray-400 mb-3"></div>
          <div className="text-sm text-gray-600 space-y-1">
            <div className="font-medium">Unterschrift & Name</div>
            <div>Datum: ________________</div>
          </div>
        </div>
      </div>

      {/* Modern Notes */}
      {data.notes && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-300">
            Besondere Hinweise
          </h3>
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-6">
            <div className="text-gray-700 leading-relaxed">{data.notes}</div>
          </div>
        </div>
      )}

      {/* Modern Footer */}
      <div className="text-center bg-gray-50 border border-gray-300 rounded-lg p-8">
        <div className="text-xl font-bold text-gray-800 mb-3">
          Lieferung erfolgreich abgeschlossen
        </div>
        <div className="text-gray-600 max-w-2xl mx-auto">
          Mit Ihrer Unterschrift bestätigen Sie den ordnungsgemäßen Erhalt aller Artikel. Vielen
          Dank für Ihr Vertrauen!
        </div>
      </div>
    </div>
  );
};
