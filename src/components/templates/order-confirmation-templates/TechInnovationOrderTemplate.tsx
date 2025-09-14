import React from 'react';
import { TemplateProps } from '../types';

export const TechInnovationOrderTemplate: React.FC<TemplateProps> = ({
  data,
  companySettings,
  customizations,
}) => {
  const logoUrl = companySettings?.logoUrl || customizations?.logoUrl;

  return (
    <div className="max-w-4xl mx-auto bg-white text-gray-800 font-sans">
      {/* Sehr schlichter Header */}
      <div className="bg-gray-50 border-b border-gray-300 p-8">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {logoUrl && (
              <div className="mb-6">
                <img src={logoUrl} alt="Company Logo" className="h-16 w-auto" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">AUFTRAGSBESTÄTIGUNG</h1>
              <div className="space-y-2 text-gray-600">
                <div>
                  Auftragsnummer:{' '}
                  <span className="text-gray-900 font-semibold">{data.documentNumber}</span>
                </div>
                <div>
                  Datum: <span className="text-gray-900 font-semibold">{data.date}</span>
                </div>
                <div>
                  Status: <span className="text-gray-900 font-semibold">Bestätigt</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-300 p-6 rounded shadow-sm max-w-sm">
            <h3 className="text-gray-900 font-bold mb-3 text-lg">{companySettings?.companyName}</h3>
            <div className="text-gray-600 space-y-1 text-sm">
              <div>{companySettings?.address?.street}</div>
              <div>
                {companySettings?.address?.zipCode} {companySettings?.address?.city}
              </div>
              <div className="border-t border-gray-200 mt-3 pt-3">
                <div>Tel: {companySettings?.contactInfo?.phone}</div>
                <div>E-Mail: {companySettings?.contactInfo?.email}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Einfache Bestätigungsnachricht */}
        <div className="mb-8">
          <div className="bg-gray-50 border border-gray-300 p-6 rounded">
            <h3 className="text-gray-900 font-semibold text-lg mb-4">Auftragsbestätigung</h3>
            <div className="text-gray-700 leading-relaxed">
              <p className="mb-3">
                Vielen Dank für Ihren Auftrag. Wir bestätigen hiermit die Annahme Ihrer Bestellung
                und werden mit der Bearbeitung zeitnah beginnen.
              </p>
              <p>
                Alle Spezifikationen wurden geprüft und freigegeben. Sie erhalten weitere
                Informationen zum Bearbeitungsfortschritt per E-Mail.
              </p>
            </div>
          </div>
        </div>

        {/* Kundeninfo */}
        <div className="grid grid-cols-12 gap-6 mb-8">
          <div className="col-span-8">
            <h4 className="text-gray-800 font-semibold mb-3">Kunde</h4>
            <div className="bg-gray-50 border border-gray-300 p-4 rounded">
              <div className="text-gray-900 text-lg font-bold mb-2">{data.customerName}</div>
              <div className="text-gray-600 space-y-1">
                <div>{data.customerAddress?.street}</div>
                <div>
                  {data.customerAddress?.zipCode} {data.customerAddress?.city}
                </div>
              </div>
              {data.customerContact && (
                <div className="border-t border-gray-300 pt-2 mt-3">
                  <div className="text-gray-600">Kontakt: {data.customerContact}</div>
                </div>
              )}
            </div>
          </div>

          <div className="col-span-4">
            <h4 className="text-gray-800 font-semibold mb-3">Auftragsdaten</h4>
            <div className="space-y-3">
              <div className="bg-gray-100 border border-gray-300 p-4 rounded">
                <div className="text-gray-600 text-sm mb-1">Auftragsdatum</div>
                <div className="text-gray-900 font-bold">{data.date}</div>
              </div>
              {data.validUntil && (
                <div className="bg-gray-100 border border-gray-300 p-4 rounded">
                  <div className="text-gray-600 text-sm mb-1">Gültig bis</div>
                  <div className="text-gray-900 font-bold">{data.validUntil}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Auftragsdetails - Neu und sauber */}
        <div className="mb-8">
          <h4 className="text-gray-800 font-semibold mb-4">Auftragsdetails</h4>

          <div className="bg-white border border-gray-300 rounded">
            {/* Tabellen-Header */}
            <div className="bg-gray-100 p-4 border-b border-gray-300">
              <div className="flex items-center">
                <div className="w-12 text-center font-semibold text-gray-700">Pos.</div>
                <div className="flex-1 font-semibold text-gray-700 ml-4">Beschreibung</div>
                <div className="w-20 text-center font-semibold text-gray-700">Anzahl</div>
                <div className="w-24 text-right font-semibold text-gray-700">Einzelpreis</div>
                <div className="w-24 text-right font-semibold text-gray-700 ml-4">Gesamt</div>
              </div>
            </div>

            {/* Tabellen-Zeilen */}
            {(data.items || []).map((item, index) => (
              <div
                key={index}
                className={`p-4 border-b border-gray-200 last:border-b-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
              >
                <div className="flex items-center">
                  <div className="w-12 text-center">
                    <span className="text-gray-700 font-bold">{index + 1}</span>
                  </div>
                  <div className="flex-1 ml-4">
                    <div className="text-gray-900 font-semibold mb-1">{item.description}</div>
                    {item.details && <div className="text-gray-600 text-sm">{item.details}</div>}
                  </div>
                  <div className="w-20 text-center">
                    <span className="bg-gray-200 px-3 py-1 rounded text-gray-800 font-semibold">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="w-24 text-right">
                    <span className="text-gray-900 font-semibold">
                      €{item.unitPrice?.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-24 text-right ml-4">
                    <span className="text-gray-900 font-bold">
                      €{(item.quantity * item.unitPrice).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Zusammenfassung */}
        <div className="flex justify-end mb-8">
          <div className="w-80">
            <h4 className="text-gray-800 font-semibold mb-3">Zusammenfassung</h4>
            <div className="bg-gray-50 border border-gray-300 rounded overflow-hidden">
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-gray-700">
                  <span>Zwischensumme:</span>
                  <span>€{data.subtotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>MwSt. ({data.taxRate}%):</span>
                  <span>€{data.taxAmount?.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-300 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-800 font-bold text-lg">Gesamtbetrag:</span>
                    <span className="text-gray-900 text-xl font-bold">
                      €{data.total?.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-100 border-t border-gray-300 p-6">
        <div className="grid grid-cols-3 gap-6 text-sm mb-4">
          <div className="bg-white border border-gray-300 p-3 rounded">
            <div className="text-gray-800 font-semibold mb-2">Unternehmensdaten</div>
            <div className="text-gray-600 space-y-1">
              <div>Steuernr.: {companySettings?.taxId}</div>
              <div>USt-ID: {companySettings?.vatId}</div>
            </div>
          </div>
          <div className="bg-white border border-gray-300 p-3 rounded">
            <div className="text-gray-800 font-semibold mb-2">Bankverbindung</div>
            <div className="text-gray-600 space-y-1">
              <div>IBAN: {companySettings?.bankDetails?.iban}</div>
              <div>BIC: {companySettings?.bankDetails?.bic}</div>
            </div>
          </div>
          <div className="bg-white border border-gray-300 p-3 rounded">
            <div className="text-gray-800 font-semibold mb-2">Kontakt</div>
            <div className="text-gray-600 space-y-1">
              <div>Tel.: {companySettings?.contactInfo?.phone}</div>
              <div>E-Mail: {companySettings?.contactInfo?.email}</div>
            </div>
          </div>
        </div>

        <div className="text-center border-t border-gray-300 pt-4">
          <div className="text-gray-800 font-semibold text-lg mb-2">
            Auftragsbestätigung erfolgreich
          </div>
          <div className="text-gray-600 text-sm">
            Vielen Dank für Ihr Vertrauen in unsere technischen Lösungen.
          </div>
        </div>
      </div>
    </div>
  );
};
