import React from 'react';
import type { TemplateProps } from '../types';
import { resolveLogoUrl } from '../utils/logoUtils';

const formatDate = (value?: string) => {
  if (!value) return 'Nicht angegeben';
  const date = new Date(value);
  return isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
};

export const ModernCleanDeliveryTemplate: React.FC<TemplateProps> = ({
  data,
  companySettings,
  customizations,
}) => {
  const logoUrl = resolveLogoUrl(customizations, companySettings, data);
  const customerNumber = (data as any).customerNumber as string | undefined;
  const orderNumber = (data as any).orderNumber || (data as any).customerOrderNumber;

  return (
    <div className="bg-white p-12 font-sans text-gray-800">
      <header className="flex justify-between items-start pb-8 border-b-2 border-gray-100">
        <div className="w-2/3">
          {logoUrl ? (
            <img src={logoUrl} alt="Firmenlogo" className="max-h-20 object-contain mb-6" />
          ) : (
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {companySettings?.companyName || 'Ihr Unternehmen'}
            </h1>
          )}
          <p className="text-xs text-gray-500">
            {companySettings?.companyName}
            {companySettings?.address &&
              `, ${companySettings.address.street}, ${companySettings.address.zipCode} ${companySettings.address.city}`}
          </p>
        </div>
        <div className="w-1/3 text-right">
          <h2 className="text-4xl font-bold text-blue-600 tracking-tight">Lieferschein</h2>
          <p className="text-sm mt-2">
            <span className="font-semibold text-gray-600">Nr:</span> {data.documentNumber}
          </p>
        </div>
      </header>

      <main className="mt-10">
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Empfänger
            </h3>
            <div className="text-lg font-medium text-gray-900">{data.customerName}</div>
            {data.customerAddress && (
              <p className="text-gray-600 mt-1 whitespace-pre-line">
                {typeof data.customerAddress === 'string'
                  ? data.customerAddress
                  : `${data.customerAddress.street}
${data.customerAddress.zipCode} ${data.customerAddress.city}`}
              </p>
            )}
          </div>
          <div className="text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="font-semibold text-gray-600">Datum:</span>
              <span className="font-medium">{formatDate(data.date)}</span>
            </div>
            {customerNumber && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="font-semibold text-gray-600">Kundennr.:</span>
                <span className="font-medium">{customerNumber}</span>
              </div>
            )}
            {orderNumber && (
              <div className="flex justify-between py-2">
                <span className="font-semibold text-gray-600">Bestellnr.:</span>
                <span className="font-medium">{orderNumber}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12">
          <p className="text-gray-600 mb-6">
            Sehr geehrte Damen und Herren, anbei erhalten Sie die bestellte Ware:
          </p>

          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="p-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-16">
                  Pos.
                </th>
                <th className="p-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-40">
                  Art.-Nr.
                </th>
                <th className="p-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Beschreibung
                </th>
                <th className="p-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-24">
                  Menge
                </th>
                <th className="p-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-24">
                  Einheit
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items?.map((item, idx) => {
                const artNr =
                  (item as any).sku || (item as any).articleNumber || (item as any).artNr || '—';
                return (
                  <tr key={idx}>
                    <td className="p-4 text-center text-gray-600">{idx + 1}</td>
                    <td className="p-4 text-gray-800">{artNr}</td>
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{item.description}</div>
                      {item.details && (
                        <div className="text-sm text-gray-500 mt-1">{item.details}</div>
                      )}
                    </td>
                    <td className="p-4 text-center font-medium text-gray-800">
                      {item.quantity?.toLocaleString('de-DE') ?? 'N/A'}
                    </td>
                    <td className="p-4 text-center text-gray-600">{item.unit || 'Stk.'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      <footer className="mt-16 pt-8 border-t-2 border-gray-100 text-center text-xs text-gray-500">
        <p className="font-semibold mb-2">{companySettings?.companyName}</p>
        <p>
          {companySettings?.address?.street}, {companySettings?.address?.zipCode}{' '}
          {companySettings?.address?.city}
        </p>
        <p>
          {companySettings?.email && `E-Mail: ${companySettings.email}`}
          {companySettings?.phone && ` | Tel: ${companySettings.phone}`}
        </p>
        <p className="mt-4">
          {companySettings?.vatId && `USt-IdNr.: ${companySettings.vatId}`}
          {companySettings?.commercialRegister &&
            ` | Handelsregister: ${companySettings.commercialRegister}`}
        </p>
        <p className="mt-6 text-blue-600 font-medium">Vielen Dank für Ihr Vertrauen!</p>
      </footer>
    </div>
  );
};

export default ModernCleanDeliveryTemplate;
