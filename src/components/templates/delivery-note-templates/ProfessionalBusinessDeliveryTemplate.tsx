import React from 'react';
import type { TemplateProps } from '../types';
import { resolveLogoUrl } from '../utils/logoUtils';
import LogoForm from '@/components/dashboard_setting/logo';

export const ProfessionalBusinessDeliveryTemplate: React.FC<TemplateProps> = ({
  data,
  companySettings,
  customizations
}) => {
  const logoUrl = resolveLogoUrl(customizations, companySettings, data);

  return (
    <div className="max-w-4xl mx-auto bg-white p-8">
      {/* Professional Header */}
      <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-gray-800">
        <div className="flex items-center space-x-4">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt="Company Logo" 
              className="h-12 w-12 object-contain"
            />
          ) : (
            // Optionaler Fallback: Wenn keine URL verfügbar, kann als Vorschau die Logo-Komponente erscheinen
            // Hinweis: In Produktions-Dokumenten sollte kein Formular gerendert werden. Hier nur als Soft-Fallback sichtbar.
            <div className="h-12 w-12 flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-300 rounded">
              Kein Logo
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-800">LIEFERSCHEIN</h1>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-gray-800">Nr. {data.documentNumber}</div>
          <div className="text-gray-600 mt-1">{data.date}</div>
        </div>
      </div>

      {/* Company and Customer Info */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Company Info */}
        <div>
          <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">
            Lieferant
          </h3>
          <div className="space-y-1 text-gray-700">
            <div className="font-semibold">{companySettings?.companyName}</div>
            {companySettings?.address && (
              <>
                <div>{companySettings.address.street}</div>
                <div>{companySettings.address.zipCode} {companySettings.address.city}</div>
              </>
            )}
            {companySettings?.contactInfo?.phone && (
              <div className="mt-2">Tel: {companySettings.contactInfo.phone}</div>
            )}
            {companySettings?.contactInfo?.email && (
              <div>E-Mail: {companySettings.contactInfo.email}</div>
            )}
          </div>
        </div>

        {/* Customer Info */}
        <div>
          <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">
            Empfänger
          </h3>
          <div className="space-y-1 text-gray-700">
            <div className="font-semibold">{data.customerName}</div>
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

      {/* Delivery Details */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">
          Lieferdetails
        </h3>
        <div className="grid grid-cols-3 gap-6 text-sm">
          <div>
            <span className="font-medium text-gray-600">Lieferdatum:</span>
            <div className="font-semibold text-gray-800">{data.date}</div>
          </div>
          {data.validUntil && (
            <div>
              <span className="font-medium text-gray-600">Gewünschter Termin:</span>
              <div className="font-semibold text-gray-800">{data.validUntil}</div>
            </div>
          )}
          {data.createdBy && (
            <div>
              <span className="font-medium text-gray-600">Bearbeitet von:</span>
              <div className="font-semibold text-gray-800">{data.createdBy}</div>
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      {data.items && data.items.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">
            Gelieferte Artikel
          </h3>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase">
                  Artikel
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase">
                  Menge
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase">
                  Einheit
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-3 py-2">
                    <div className="font-medium text-gray-800">{item.description}</div>
                    {item.details && (
                      <div className="text-xs text-gray-600 mt-1">{item.details}</div>
                    )}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-800">
                    {item.quantity}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center text-gray-700">
                    {item.unit || 'Stk.'}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center">
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

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="border border-gray-300 p-4">
          <h4 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide">Lieferant</h4>
          <div className="h-16 mb-3"></div>
          <div className="border-b border-gray-400 mb-2"></div>
          <div className="text-xs text-gray-600">
            <div>Unterschrift, Stempel</div>
            <div className="mt-1">Datum: _______________</div>
          </div>
        </div>
        <div className="border border-gray-300 p-4">
          <h4 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide">Empfänger</h4>
          <div className="h-16 mb-3"></div>
          <div className="border-b border-gray-400 mb-2"></div>
          <div className="text-xs text-gray-600">
            <div>Unterschrift</div>
            <div className="mt-1">Datum: _______________</div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {data.notes && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">
            Bemerkungen
          </h3>
          <div className="text-gray-700 border border-gray-300 p-3 bg-gray-50">
            {data.notes}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300">
        <div className="text-center text-xs text-gray-600">
          <div className="font-medium">Bestätigung der Lieferung</div>
          <div className="mt-1">
            Hiermit bestätigen wir den Erhalt der oben aufgeführten Artikel in einwandfreiem Zustand.
          </div>
        </div>
      </div>
    </div>
  );
};