'use client';

import React from 'react';

// Invoice Template Types
export type InvoiceTemplate = 'classic' | 'modern' | 'minimal' | 'corporate' | 'creative';

export interface InvoiceData {
  id: string;
  number: string;
  invoiceNumber: string;
  date: string;
  issueDate: string;
  dueDate: string;
  customerName: string;
  customerAddress: string;
  customerEmail?: string;
  description?: string;
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  companyWebsite?: string;
  companyLogo?: string;
  companyVatId?: string;
  companyTaxNumber?: string;
  companyRegister?: string;
  districtCourt?: string;
  legalForm?: string;
  companyTax?: string;
  // Bankdaten hinzugefügt
  iban?: string;
  accountHolder?: string;
  items: InvoiceItem[];
  amount: number;
  tax: number;
  total: number;
  isSmallBusiness: boolean;
  vatRate: number;
  priceInput: 'netto' | 'brutto';
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceTemplateProps {
  template: InvoiceTemplate;
  data: InvoiceData;
  preview?: boolean;
}

// Template 1: Classic - Traditional business style
export function ClassicTemplate({ data, preview }: Omit<InvoiceTemplateProps, 'template'>) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  return (
    <div className={`bg-white p-8 ${preview ? 'scale-75 transform-origin-top-left' : ''}`}>
      {/* Header */}
      <div className="border-b-2 border-gray-800 pb-6 mb-6">
        <div className="flex justify-between items-start">
          <div className="flex items-start space-x-4">
            {data.companyLogo && (
              <div className="flex-shrink-0">
                <img
                  src={data.companyLogo}
                  alt={`${data.companyName} Logo`}
                  className="h-16 w-auto object-contain"
                />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{data.companyName}</h1>
              {data.companyAddress && (
                <div className="text-gray-600 text-sm leading-relaxed">
                  {data.companyAddress.split('\n').map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">RECHNUNG</h2>
            <div className="text-sm text-gray-600">
              <div>Rechnungsnr.: {data.invoiceNumber}</div>
              <div>Datum: {formatDate(data.issueDate)}</div>
              <div>Fällig: {formatDate(data.dueDate)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Rechnungsempfänger:</h3>
        <div className="bg-gray-50 p-4 rounded">
          <div className="font-semibold">{data.customerName}</div>
          {data.customerAddress && (
            <div className="text-sm text-gray-600 mt-1">
              {data.customerAddress.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
          {data.customerEmail && (
            <div className="text-sm text-gray-600 mt-1">{data.customerEmail}</div>
          )}
        </div>
      </div>

      {/* Invoice Items */}
      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="text-left p-3 border">Beschreibung</th>
              <th className="text-right p-3 border w-24">Menge</th>
              <th className="text-right p-3 border w-32">Einzelpreis</th>
              <th className="text-right p-3 border w-32">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            {data.items && data.items.length > 0 ? (
              data.items.map(item => (
                <tr key={item.id} className="border-b">
                  <td className="p-3 border">{item.description}</td>
                  <td className="p-3 border text-right">{item.quantity}</td>
                  <td className="p-3 border text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="p-3 border text-right">{formatCurrency(item.total)}</td>
                </tr>
              ))
            ) : (
              <tr className="border-b">
                <td className="p-3 border" colSpan={2}>
                  {data.description}
                </td>
                <td className="p-3 border text-right">1</td>
                <td className="p-3 border text-right">{formatCurrency(data.amount)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-80">
          {!data.isSmallBusiness ? (
            <>
              <div className="flex justify-between py-2 border-b">
                <span>Nettobetrag:</span>
                <span>{formatCurrency(data.amount)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span>MwSt. ({data.vatRate || 19}%):</span>
                <span>{formatCurrency(data.tax)}</span>
              </div>
              <div className="flex justify-between py-3 font-bold text-lg bg-gray-800 text-white px-3">
                <span>Gesamtbetrag:</span>
                <span>{formatCurrency(data.total)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between py-3 font-bold text-lg bg-gray-800 text-white px-3">
                <span>Gesamtbetrag:</span>
                <span>{formatCurrency(data.total)}</span>
              </div>
              <div className="text-xs text-gray-600 mt-2 text-center">
                <em>
                  Gemäß § 19 UStG wird keine Umsatzsteuer ausgewiesen.
                  <br />
                  (Kleinunternehmerregelung)
                </em>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t pt-6 text-sm text-gray-600">
        <div className="grid grid-cols-3 gap-8">
          <div>
            <strong>Kontakt:</strong>
            <br />
            {data.companyEmail && <div>E-Mail: {data.companyEmail}</div>}
            {data.companyPhone && <div>Tel: {data.companyPhone}</div>}
            {data.companyWebsite && <div>Web: {data.companyWebsite}</div>}
          </div>
          <div>
            <strong>Zahlungsbedingungen:</strong>
            <br />
            Zahlbar innerhalb 14 Tagen
            <br />
            ohne Abzug.
          </div>
          <div>
            <strong>Rechtliche Angaben:</strong>
            <br />
            {data.companyTax && <div>Steuer-Nr: {data.companyTax}</div>}
            {data.companyVatId && <div>USt-IdNr: {data.companyVatId}</div>}
            {data.companyRegister && data.districtCourt && (
              <div>
                {data.districtCourt} {data.companyRegister}
              </div>
            )}
            {data.legalForm && <div>{data.legalForm}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// Template 2: Modern - Clean and contemporary
export function ModernTemplate({ data, preview }: Omit<InvoiceTemplateProps, 'template'>) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  return (
    <div className={`bg-white p-8 ${preview ? 'scale-75 transform-origin-top-left' : ''}`}>
      {/* Header with accent */}
      <div className="relative mb-8">
        <div className="absolute top-0 left-0 w-2 h-20 bg-[#14ad9f]"></div>
        <div className="pl-6 flex items-start space-x-4">
          {data.companyLogo && (
            <div className="flex-shrink-0">
              <img
                src={data.companyLogo}
                alt={`${data.companyName} Logo`}
                className="h-16 w-auto object-contain"
              />
            </div>
          )}
          <div>
            <h1 className="text-4xl font-light text-gray-800 mb-2">{data.companyName}</h1>
            <div className="text-gray-500 text-sm">
              {data.companyAddress && <div>{data.companyAddress.replace(/\n/g, ' • ')}</div>}
              {data.companyEmail && <div className="mt-1">{data.companyEmail}</div>}
            </div>
          </div>
        </div>

        <div className="absolute top-0 right-0">
          <div className="text-right">
            <h2 className="text-3xl font-light text-[#14ad9f] mb-2">RECHNUNG</h2>
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                <span className="font-medium">Nr:</span> {data.invoiceNumber}
              </div>
              <div>
                <span className="font-medium">Datum:</span> {formatDate(data.issueDate)}
              </div>
              <div>
                <span className="font-medium">Fällig:</span> {formatDate(data.dueDate)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Info with modern card */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-gray-50 to-white p-6 rounded-lg border-l-4 border-[#14ad9f]">
          <h3 className="text-lg font-medium text-gray-800 mb-3">Rechnung an:</h3>
          <div className="text-gray-700">
            <div className="font-semibold text-lg">{data.customerName}</div>
            {data.customerAddress && (
              <div className="text-sm mt-2 leading-relaxed">
                {data.customerAddress.split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}
            {data.customerEmail && (
              <div className="text-sm text-[#14ad9f] mt-2">{data.customerEmail}</div>
            )}
          </div>
        </div>
      </div>

      {/* Modern table */}
      <div className="mb-8">
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-[#14ad9f] to-[#0f9d84] text-white">
              <tr>
                <th className="text-left p-4">Leistung</th>
                <th className="text-right p-4 w-24">Menge</th>
                <th className="text-right p-4 w-32">Preis</th>
                <th className="text-right p-4 w-32">Summe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.items && data.items.length > 0 ? (
                data.items.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-4">{item.description}</td>
                    <td className="p-4 text-right">{item.quantity}</td>
                    <td className="p-4 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="p-4 text-right font-medium">{formatCurrency(item.total)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-4" colSpan={2}>
                    {data.description}
                  </td>
                  <td className="p-4 text-right">1</td>
                  <td className="p-4 text-right font-medium">{formatCurrency(data.amount)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modern totals */}
      <div className="flex justify-end mb-8">
        <div className="w-80 space-y-2">
          {!data.isSmallBusiness ? (
            <>
              <div className="flex justify-between py-2 text-gray-600">
                <span>Nettobetrag:</span>
                <span>{formatCurrency(data.amount)}</span>
              </div>
              <div className="flex justify-between py-2 text-gray-600">
                <span>MwSt. ({data.vatRate || 19}%):</span>
                <span>{formatCurrency(data.tax)}</span>
              </div>
              <div className="flex justify-between py-4 text-xl font-medium bg-gradient-to-r from-[#14ad9f] to-[#0f9d84] text-white px-4 rounded-lg">
                <span>Gesamt:</span>
                <span>{formatCurrency(data.total)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between py-4 text-xl font-medium bg-gradient-to-r from-[#14ad9f] to-[#0f9d84] text-white px-4 rounded-lg">
                <span>Gesamt:</span>
                <span>{formatCurrency(data.total)}</span>
              </div>
              <div className="text-xs text-gray-600 mt-3 text-center bg-gray-50 p-3 rounded-lg">
                <em>
                  Gemäß § 19 UStG wird keine Umsatzsteuer ausgewiesen.
                  <br />
                  (Kleinunternehmerregelung)
                </em>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modern footer */}
      <div className="border-t pt-6">
        <div className="grid grid-cols-2 gap-8 text-sm">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Zahlungshinweise</h4>
              <p className="text-gray-600">
                Bitte überweisen Sie den Betrag bis zum Fälligkeitsdatum unter Angabe der
                Rechnungsnummer.
              </p>
            </div>
          </div>
          <div className="text-right space-y-2">
            <div className="text-gray-600 space-y-1">
              <div className="font-medium">{data.companyName}</div>
              <div>{data.companyAddress}</div>
              {data.companyWebsite && <div>Web: {data.companyWebsite}</div>}
              <div>{data.companyEmail}</div>
              {data.companyPhone && <div>Tel: {data.companyPhone}</div>}
              {data.companyVatId && <div>USt-IdNr.: {data.companyVatId}</div>}
              {data.companyTaxNumber && <div>Steuernummer: {data.companyTaxNumber}</div>}
              {data.companyRegister && data.districtCourt && (
                <div>
                  {data.companyRegister} {data.districtCourt}
                </div>
              )}
              {data.legalForm && <div>{data.legalForm}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Template 3: Minimal - Ultra clean and simple
export function MinimalTemplate({ data, preview }: Omit<InvoiceTemplateProps, 'template'>) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  return (
    <div className={`bg-white p-12 ${preview ? 'scale-75 transform-origin-top-left' : ''}`}>
      {/* Minimal header */}
      <div className="flex justify-between items-start mb-16">
        <div className="flex items-center space-x-4">
          {data.companyLogo && (
            <div className="flex-shrink-0">
              <img
                src={data.companyLogo}
                alt={`${data.companyName} Logo`}
                className="h-12 w-auto object-contain"
              />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-normal text-gray-900">{data.companyName}</h1>
          </div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-thin text-gray-400 mb-4">RECHNUNG</div>
          <div className="text-sm text-gray-500 space-y-1">
            <div>{data.invoiceNumber}</div>
            <div>{formatDate(data.issueDate)}</div>
          </div>
        </div>
      </div>

      {/* Customer - minimal */}
      <div className="mb-16">
        <div className="text-gray-900">
          <div className="font-medium text-lg mb-2">{data.customerName}</div>
          {data.customerAddress && (
            <div className="text-gray-600 text-sm leading-loose">
              {data.customerAddress.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Items - ultra minimal */}
      <div className="mb-16">
        <div className="border-b border-gray-200 pb-4 mb-8">
          {data.items && data.items.length > 0 ? (
            data.items.map(item => (
              <div key={item.id} className="flex justify-between items-center py-3">
                <div className="flex-1">
                  <div className="text-gray-900">{item.description}</div>
                  <div className="text-sm text-gray-500">
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </div>
                </div>
                <div className="text-gray-900 font-medium">{formatCurrency(item.total)}</div>
              </div>
            ))
          ) : (
            <div className="flex justify-between items-center py-3">
              <div className="text-gray-900">{data.description}</div>
              <div className="text-gray-900 font-medium">{formatCurrency(data.amount)}</div>
            </div>
          )}
        </div>

        {/* Minimal totals */}
        <div className="space-y-2 max-w-xs ml-auto">
          {!data.isSmallBusiness ? (
            <>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Netto</span>
                <span>{formatCurrency(data.amount)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>MwSt. ({data.vatRate || 19}%)</span>
                <span>{formatCurrency(data.tax)}</span>
              </div>
              <div className="flex justify-between text-lg font-medium pt-2 border-t">
                <span>Gesamt</span>
                <span>{formatCurrency(data.total)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between text-lg font-medium pt-2 border-t">
                <span>Gesamt</span>
                <span>{formatCurrency(data.total)}</span>
              </div>
              <div className="text-xs text-gray-500 mt-2 text-center">
                <em>
                  Gemäß § 19 UStG wird keine Umsatzsteuer ausgewiesen.
                  <br />
                  (Kleinunternehmerregelung)
                </em>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Minimal footer */}
      <div className="text-xs text-gray-400 text-center space-y-2">
        <div>Fällig bis {formatDate(data.dueDate)}</div>
        <div className="space-y-1">
          <div className="font-medium">{data.companyName}</div>
          <div>{data.companyAddress}</div>
          {data.companyWebsite && <div>Web: {data.companyWebsite}</div>}
          <div>{data.companyEmail}</div>
          {data.companyPhone && <div>Tel: {data.companyPhone}</div>}
          {data.companyVatId && <div>USt-IdNr.: {data.companyVatId}</div>}
          {data.companyTaxNumber && <div>Steuernummer: {data.companyTaxNumber}</div>}
          {data.companyRegister && data.districtCourt && (
            <div>
              {data.companyRegister} {data.districtCourt}
            </div>
          )}
          {data.legalForm && <div>{data.legalForm}</div>}
        </div>
      </div>
    </div>
  );
}

// Template 4: Corporate - Professional business style
export function CorporateTemplate({ data, preview }: Omit<InvoiceTemplateProps, 'template'>) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  return (
    <div className={`bg-white ${preview ? 'scale-75 transform-origin-top-left' : ''}`}>
      {/* Corporate header with dark background */}
      <div className="bg-gray-900 text-white p-8">
        <div className="flex justify-between items-start">
          <div className="flex items-start space-x-4">
            {data.companyLogo && (
              <div className="flex-shrink-0">
                <img
                  src={data.companyLogo}
                  alt={`${data.companyName} Logo`}
                  className="h-16 w-auto object-contain bg-white rounded p-2"
                />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold mb-2">{data.companyName}</h1>
              {data.companyAddress && (
                <div className="text-gray-300 text-sm">
                  {data.companyAddress.replace(/\n/g, ' • ')}
                </div>
              )}
              <div className="mt-2 text-gray-300 text-sm">
                {data.companyEmail && <span>{data.companyEmail}</span>}
                {data.companyPhone && <span> • {data.companyPhone}</span>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-white text-gray-900 px-6 py-3 rounded">
              <h2 className="text-2xl font-bold mb-2">RECHNUNG</h2>
              <div className="text-sm space-y-1">
                <div>
                  <strong>Nr:</strong> {data.invoiceNumber}
                </div>
                <div>
                  <strong>Datum:</strong> {formatDate(data.issueDate)}
                </div>
                <div>
                  <strong>Fällig:</strong> {formatDate(data.dueDate)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Customer info */}
        <div className="mb-8">
          <div className="border border-gray-300 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">
              RECHNUNGSEMPFÄNGER
            </h3>
            <div>
              <div className="font-bold text-lg">{data.customerName}</div>
              {data.customerAddress && (
                <div className="text-gray-700 mt-2">
                  {data.customerAddress.split('\n').map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}
              {data.customerEmail && <div className="text-gray-700 mt-2">{data.customerEmail}</div>}
            </div>
          </div>
        </div>

        {/* Corporate table */}
        <div className="mb-8">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-4 text-left font-bold">BESCHREIBUNG</th>
                <th className="border border-gray-300 p-4 text-center font-bold w-20">MENGE</th>
                <th className="border border-gray-300 p-4 text-right font-bold w-32">
                  EINZELPREIS
                </th>
                <th className="border border-gray-300 p-4 text-right font-bold w-32">
                  GESAMTPREIS
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items && data.items.length > 0 ? (
                data.items.map(item => (
                  <tr key={item.id}>
                    <td className="border border-gray-300 p-4">{item.description}</td>
                    <td className="border border-gray-300 p-4 text-center">{item.quantity}</td>
                    <td className="border border-gray-300 p-4 text-right">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="border border-gray-300 p-4 text-right font-medium">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="border border-gray-300 p-4" colSpan={2}>
                    {data.description}
                  </td>
                  <td className="border border-gray-300 p-4 text-center">1</td>
                  <td className="border border-gray-300 p-4 text-right font-medium">
                    {formatCurrency(data.amount)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Corporate totals */}
        <div className="flex justify-end mb-8">
          <div className="w-96">
            <table className="w-full border-collapse border border-gray-300">
              <tbody>
                {!data.isSmallBusiness ? (
                  <>
                    <tr>
                      <td className="border border-gray-300 p-3 bg-gray-100 font-bold">
                        NETTOBETRAG:
                      </td>
                      <td className="border border-gray-300 p-3 text-right">
                        {formatCurrency(data.amount)}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-3 bg-gray-100 font-bold">
                        MEHRWERTSTEUER ({data.vatRate || 19}%):
                      </td>
                      <td className="border border-gray-300 p-3 text-right">
                        {formatCurrency(data.tax)}
                      </td>
                    </tr>
                    <tr className="bg-gray-900 text-white">
                      <td className="border border-gray-300 p-4 font-bold text-lg">
                        GESAMTBETRAG:
                      </td>
                      <td className="border border-gray-300 p-4 text-right font-bold text-lg">
                        {formatCurrency(data.total)}
                      </td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr className="bg-gray-900 text-white">
                      <td className="border border-gray-300 p-4 font-bold text-lg">
                        GESAMTBETRAG:
                      </td>
                      <td className="border border-gray-300 p-4 text-right font-bold text-lg">
                        {formatCurrency(data.total)}
                      </td>
                    </tr>
                    <tr>
                      <td
                        colSpan={2}
                        className="border border-gray-300 p-3 text-center text-sm bg-gray-50"
                      >
                        <em>
                          Gemäß § 19 UStG wird keine Umsatzsteuer ausgewiesen.
                          <br />
                          (Kleinunternehmerregelung)
                        </em>
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Corporate footer */}
        <div className="border-t-2 border-gray-900 pt-6">
          <div className="grid grid-cols-3 gap-8 text-sm">
            <div>
              <h4 className="font-bold text-gray-900 mb-2">ZAHLUNGSBEDINGUNGEN</h4>
              <p className="text-gray-700">
                Zahlbar innerhalb von 14 Tagen netto ohne Abzug. Bei Zahlungsverzug werden
                Verzugszinsen in Höhe von 8% p.a. berechnet.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2">BANKVERBINDUNG</h4>
              <div className="text-gray-700 space-y-1">
                <div>Bank: Deutsche Bank AG</div>
                <div>IBAN: DE89 3704 0044 0532 0130 00</div>
                <div>BIC: DEUTDEDBCOL</div>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2">STEUERLICHE ANGABEN</h4>
              <div className="text-gray-700 space-y-1">
                <div className="font-medium">{data.companyName}</div>
                <div>{data.companyAddress}</div>
                {data.companyWebsite && <div>Web: {data.companyWebsite}</div>}
                <div>{data.companyEmail}</div>
                {data.companyPhone && <div>Tel: {data.companyPhone}</div>}
                {data.companyVatId && <div>USt-IdNr.: {data.companyVatId}</div>}
                {data.companyTaxNumber && <div>Steuernummer: {data.companyTaxNumber}</div>}
                {data.companyRegister && data.districtCourt && (
                  <div>
                    {data.companyRegister} {data.districtCourt}
                  </div>
                )}
                {data.legalForm && <div>{data.legalForm}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Template 5: Creative - Modern and colorful
export function CreativeTemplate({ data, preview }: Omit<InvoiceTemplateProps, 'template'>) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  return (
    <div className={`bg-white ${preview ? 'scale-75 transform-origin-top-left' : ''}`}>
      {/* Creative header with gradient */}
      <div className="bg-gradient-to-br from-[#14ad9f] via-[#0f9d84] to-blue-600 p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full transform translate-x-16 -translate-y-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full transform -translate-x-12 translate-y-12"></div>

        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div className="flex items-start space-x-4">
              {data.companyLogo && (
                <div className="flex-shrink-0">
                  <img
                    src={data.companyLogo}
                    alt={`${data.companyName} Logo`}
                    className="h-16 w-auto object-contain bg-white rounded-lg p-2"
                  />
                </div>
              )}
              <div>
                <h1 className="text-4xl font-bold mb-3">{data.companyName}</h1>
                <div className="text-gray-100 text-sm max-w-md">
                  {data.companyAddress && (
                    <div className="leading-relaxed">
                      {data.companyAddress.split('\n').map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                    </div>
                  )}
                  <div className="mt-2">
                    {data.companyEmail && <span>{data.companyEmail}</span>}
                    {data.companyPhone && <span> • {data.companyPhone}</span>}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-white text-gray-900 px-8 py-6 rounded-2xl shadow-xl">
                <h2 className="text-3xl font-bold text-[#14ad9f] mb-4">RECHNUNG</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">Nummer:</span>
                    <span>{data.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Datum:</span>
                    <span>{formatDate(data.issueDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Fällig:</span>
                    <span>{formatDate(data.dueDate)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Creative customer card */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-2xl border-l-4 border-[#14ad9f] shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <div className="w-3 h-3 bg-[#14ad9f] rounded-full mr-3"></div>
              Rechnung für
            </h3>
            <div>
              <div className="text-xl font-bold text-gray-900 mb-2">{data.customerName}</div>
              {data.customerAddress && (
                <div className="text-gray-600 leading-relaxed">
                  {data.customerAddress.split('\n').map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}
              {data.customerEmail && (
                <div className="text-[#14ad9f] font-medium mt-2">{data.customerEmail}</div>
              )}
            </div>
          </div>
        </div>

        {/* Creative table */}
        <div className="mb-8">
          <div className="overflow-hidden rounded-2xl shadow-lg border border-gray-100">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-[#14ad9f] to-blue-600 text-white">
                <tr>
                  <th className="text-left p-6 font-bold">Leistung</th>
                  <th className="text-center p-6 font-bold w-24">Qty</th>
                  <th className="text-right p-6 font-bold w-32">Preis</th>
                  <th className="text-right p-6 font-bold w-32">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items && data.items.length > 0 ? (
                  data.items.map((item, index) => (
                    <tr
                      key={item.id}
                      className={`${index % 2 === 0 ? 'bg-white' : 'bg-gradient-to-r from-gray-50 to-blue-50'} border-b border-gray-100`}
                    >
                      <td className="p-6">
                        <div className="font-medium text-gray-900">{item.description}</div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="bg-[#14ad9f] text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto font-bold">
                          {item.quantity}
                        </div>
                      </td>
                      <td className="p-6 text-right text-gray-600">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="p-6 text-right font-bold text-gray-900">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="bg-white border-b border-gray-100">
                    <td className="p-6">
                      <div className="font-medium text-gray-900">{data.description}</div>
                    </td>
                    <td className="p-6 text-center">
                      <div className="bg-[#14ad9f] text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto font-bold">
                        1
                      </div>
                    </td>
                    <td className="p-6 text-right text-gray-600">{formatCurrency(data.amount)}</td>
                    <td className="p-6 text-right font-bold text-gray-900">
                      {formatCurrency(data.amount)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Creative totals */}
        <div className="flex justify-end mb-8">
          <div className="w-96">
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-6 shadow-lg">
              <div className="space-y-3">
                {!data.isSmallBusiness ? (
                  <>
                    <div className="flex justify-between text-gray-600">
                      <span>Nettobetrag:</span>
                      <span className="font-medium">{formatCurrency(data.amount)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>MwSt. ({data.vatRate || 19}%):</span>
                      <span className="font-medium">{formatCurrency(data.tax)}</span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between text-2xl font-bold">
                        <span className="text-gray-900">Gesamt:</span>
                        <span className="text-[#14ad9f]">{formatCurrency(data.total)}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="border-t pt-3">
                      <div className="flex justify-between text-2xl font-bold">
                        <span className="text-gray-900">Gesamt:</span>
                        <span className="text-[#14ad9f]">{formatCurrency(data.total)}</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 mt-3 text-center bg-white p-3 rounded-lg">
                      <em>
                        Gemäß § 19 UStG wird keine Umsatzsteuer ausgewiesen.
                        <br />
                        (Kleinunternehmerregelung)
                      </em>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Creative footer */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-6">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                <div className="w-2 h-2 bg-[#14ad9f] rounded-full mr-2"></div>
                Zahlungsinfo
              </h4>
              <p className="text-gray-700 text-sm leading-relaxed">
                Vielen Dank für Ihr Vertrauen! Der Betrag ist bis zum Fälligkeitsdatum unter Angabe
                der Rechnungsnummer zu überweisen.
              </p>
            </div>
            <div className="text-right">
              <h4 className="font-bold text-gray-900 mb-3">Kontakt & Steuer</h4>
              <div className="text-sm text-gray-700 space-y-1">
                <div className="font-medium">{data.companyName}</div>
                <div>{data.companyAddress}</div>
                {data.companyWebsite && <div>Web: {data.companyWebsite}</div>}
                <div>{data.companyEmail}</div>
                {data.companyPhone && <div>Tel: {data.companyPhone}</div>}
                {data.companyVatId && <div>USt-IdNr.: {data.companyVatId}</div>}
                {data.companyTaxNumber && <div>Steuernummer: {data.companyTaxNumber}</div>}
                {data.companyRegister && data.districtCourt && (
                  <div>
                    {data.companyRegister} {data.districtCourt}
                  </div>
                )}
                {data.legalForm && <div>{data.legalForm}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Template Renderer
export function InvoiceTemplateRenderer({ template, data, preview = false }: InvoiceTemplateProps) {
  switch (template) {
    case 'classic':
      return <ClassicTemplate data={data} preview={preview} />;
    case 'modern':
      return <ModernTemplate data={data} preview={preview} />;
    case 'minimal':
      return <MinimalTemplate data={data} preview={preview} />;
    case 'corporate':
      return <CorporateTemplate data={data} preview={preview} />;
    case 'creative':
      return <CreativeTemplate data={data} preview={preview} />;
    default:
      return <ClassicTemplate data={data} preview={preview} />;
  }
}

// Template metadata for selection
export const INVOICE_TEMPLATES = [
  {
    id: 'classic' as InvoiceTemplate,
    name: 'Klassisch',
    description: 'Traditionelles Geschäftsdesign mit klarer Struktur',
    preview: '/api/placeholder/invoice-classic.jpg',
  },
  {
    id: 'modern' as InvoiceTemplate,
    name: 'Modern',
    description: 'Zeitgemäßes Design mit Taskilo-Branding',
    preview: '/api/placeholder/invoice-modern.jpg',
  },
  {
    id: 'minimal' as InvoiceTemplate,
    name: 'Minimal',
    description: 'Reduziertes, elegantes Design',
    preview: '/api/placeholder/invoice-minimal.jpg',
  },
  {
    id: 'corporate' as InvoiceTemplate,
    name: 'Corporate',
    description: 'Professionelles Unternehmensdesign',
    preview: '/api/placeholder/invoice-corporate.jpg',
  },
  {
    id: 'creative' as InvoiceTemplate,
    name: 'Kreativ',
    description: 'Farbenfrohes, modernes Design',
    preview: '/api/placeholder/invoice-creative.jpg',
  },
];
