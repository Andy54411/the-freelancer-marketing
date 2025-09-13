import React from 'react';
import type { TemplateProps } from '../types';
import { resolveLogoUrl } from '../utils/logoUtils';

export const MinimalistElegantDeliveryTemplate: React.FC<TemplateProps> = ({
  data,
  companySettings,
  customizations
}) => {
  const logoUrl = resolveLogoUrl(customizations, companySettings, data);

  return (
    <div className="max-w-4xl mx-auto bg-white p-12">
      {/* Minimalist Header */}
      <div className="flex justify-between items-start mb-16 pb-6 border-b border-gray-300">
        <div className="flex items-center space-x-8">
          {logoUrl && (
            <img 
              src={logoUrl} 
              alt="Company Logo" 
              className="h-10 w-10 object-contain opacity-80"
            />
          )}
          <div>
            <h1 className="text-2xl font-light text-gray-800 tracking-wide">
              LIEFERSCHEIN
            </h1>
          </div>
        </div>
        <div className="text-right text-gray-600">
          <div className="text-xl font-light">{data.documentNumber}</div>
          <div className="text-xs mt-2 uppercase tracking-widest">{data.date}</div>
        </div>
      </div>

      {/* Clean Address Section */}
      <div className="grid grid-cols-2 gap-16 mb-16">
        {/* Company */}
        <div>
          <div className="text-xs uppercase tracking-widest text-gray-400 mb-4">Absender</div>
          <div className="space-y-1 text-gray-700">
            <div className="font-light">{companySettings?.companyName}</div>
            {companySettings?.address && (
              <>
                <div className="text-sm">{companySettings.address.street}</div>
                <div className="text-sm">
                  {companySettings.address.zipCode} {companySettings.address.city}
                </div>
              </>
            )}
            <div className="pt-3 space-y-1 text-xs text-gray-500">
              {companySettings?.contactInfo?.phone && (
                <div>{companySettings.contactInfo.phone}</div>
              )}
              {companySettings?.contactInfo?.email && (
                <div>{companySettings.contactInfo.email}</div>
              )}
            </div>
          </div>
        </div>

        {/* Customer */}
        <div>
          <div className="text-xs uppercase tracking-widest text-gray-400 mb-4">Empfänger</div>
          <div className="space-y-1 text-gray-700">
            <div className="font-light">{data.customerName}</div>
            {data.customerAddress && (
              <div className="text-sm whitespace-pre-line">
                {typeof data.customerAddress === 'string' 
                  ? data.customerAddress 
                  : `${data.customerAddress.street}\n${data.customerAddress.zipCode} ${data.customerAddress.city}`
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Minimal Delivery Details */}
      <div className="mb-16">
        <div className="text-xs uppercase tracking-widest text-gray-400 mb-6">Lieferinformationen</div>
        <div className="grid grid-cols-3 gap-8">
          <div>
            <div className="text-sm text-gray-500">Lieferdatum</div>
            <div className="font-light text-gray-800">{data.date}</div>
          </div>
          {data.validUntil && (
            <div>
              <div className="text-sm text-gray-500">Gewünschter Termin</div>
              <div className="font-light text-gray-800">{data.validUntil}</div>
            </div>
          )}
          {data.createdBy && (
            <div>
              <div className="text-sm text-gray-500">Bearbeitung</div>
              <div className="font-light text-gray-800">{data.createdBy}</div>
            </div>
          )}
        </div>
      </div>

      {/* Clean Items List */}
      {data.items && data.items.length > 0 && (
        <div className="mb-16">
          <div className="text-xs uppercase tracking-widest text-gray-400 mb-6">Gelieferte Artikel</div>
          <div className="space-y-4">
            {data.items.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-3 border-b border-gray-100">
                <div className="flex-1">
                  <div className="font-light text-gray-800">{item.description}</div>
                  {item.details && (
                    <div className="text-sm text-gray-500 mt-1">{item.details}</div>
                  )}
                </div>
                <div className="flex items-center space-x-8 text-sm">
                  <div className="text-right">
                    <div className="font-medium text-gray-800">{item.quantity}</div>
                    <div className="text-gray-500">{item.unit || 'Stk.'}</div>
                  </div>
                  <div className="text-gray-400 text-xs">
                    Geliefert
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Minimal Signatures */}
      <div className="grid grid-cols-2 gap-16 mb-16">
        <div>
          <div className="text-xs uppercase tracking-widest text-gray-400 mb-6">Lieferant</div>
          <div className="h-16 mb-6"></div>
          <div className="border-b border-gray-300 mb-2"></div>
          <div className="text-xs text-gray-500">
            <div>Unterschrift</div>
            <div className="mt-2">Datum: ____________</div>
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-gray-400 mb-6">Empfänger</div>
          <div className="h-16 mb-6"></div>
          <div className="border-b border-gray-300 mb-2"></div>
          <div className="text-xs text-gray-500">
            <div>Unterschrift</div>
            <div className="mt-2">Datum: ____________</div>
          </div>
        </div>
      </div>

      {/* Clean Notes */}
      {data.notes && (
        <div className="mb-12">
          <div className="text-xs uppercase tracking-widest text-gray-400 mb-4">Bemerkungen</div>
          <div className="text-gray-700 font-light leading-relaxed">
            {data.notes}
          </div>
        </div>
      )}

      {/* Minimalist Footer */}
      <div className="pt-6 border-t border-gray-200">
        <div className="text-center">
          <div className="text-sm text-gray-500 font-light">
            Bestätigung der ordnungsgemäßen Lieferung
          </div>
        </div>
      </div>
    </div>
  );
};