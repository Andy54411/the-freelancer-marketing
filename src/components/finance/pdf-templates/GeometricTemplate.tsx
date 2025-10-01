import React from 'react';
import { formatDate } from '@/lib/utils';
import { ProcessedPDFData } from '@/hooks/pdf/usePDFTemplateData';
import { TaxRulesInfo } from './common/TaxRulesInfo';
import { TotalsDisplay } from './common/TotalsDisplay';
import { ItemsTable } from './common/ItemsTable';

import { FooterText } from './common/FooterText';
import { SimpleFooter } from './common/SimpleFooter';

interface GeometricTemplateProps {
  data: ProcessedPDFData;
  color: string;
  logoSize: number;
  pageMode?: 'single' | 'multi';
}

export const GeometricTemplate: React.FC<GeometricTemplateProps> = ({
  data,
  color,
  logoSize,
  pageMode = 'multi',
}) => {
  return (
    <div
      className="bg-white w-full max-w-[210mm] mx-auto text-xs"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @page { size: A4; margin: 0; }
          .pdf-page {
            width: 210mm;
            min-height: 297mm;
            page-break-after: always;
            break-after: page;
          }
          .pdf-page:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }
        `,
        }}
      />

      {/* ========= SEITE 1 ========= */}
      <div className="pdf-page flex flex-col">
        {/* Header Seite 1 */}
        <div className="p-6 pb-4">
          <div
            className="relative mb-8"
            style={{ minHeight: data.companyLogo ? '160px' : '120px' }}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{data.companyName}</h1>
                <div className="mt-2">
                  <div className="text-lg font-semibold" style={{ color }}>
                    {data.documentLabel}
                  </div>
                  <div className="text-sm text-gray-600">Nr. {data.invoiceNumber}</div>
                  <div className="text-sm text-gray-600">Datum: {formatDate(data.invoiceDate)}</div>
                </div>
              </div>

              <div className="flex-shrink-0">
                {data.companyLogo && (
                  <img
                    src={data.companyLogo}
                    alt={data.companyName}
                    className="h-20 w-auto object-contain"
                    style={{ maxHeight: `${logoSize}px` }}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <div className="font-semibold mb-3" style={{ color }}>
                Rechnungsempfänger
              </div>
              <div className="space-y-2">
                <div className="font-medium text-lg">{data.customerName}</div>
                {data.customerAddressParsed.street && (
                  <div>{data.customerAddressParsed.street}</div>
                )}
                {(data.customerAddressParsed.postalCode || data.customerAddressParsed.city) && (
                  <div>
                    {data.customerAddressParsed.postalCode} {data.customerAddressParsed.city}
                  </div>
                )}
                {data.customerAddressParsed.country && (
                  <div>{data.customerAddressParsed.country}</div>
                )}
                {data.customerVatId && (
                  <div className="mt-2 text-sm">USt-IdNr.: {data.customerVatId}</div>
                )}
              </div>
            </div>

            <div>
              <div className="font-semibold mb-3" style={{ color }}>
                Rechnungsdetails
              </div>
              <div className="space-y-2">
                <div>Rechnungsnr.: {data.invoiceNumber}</div>
                <div>Datum: {formatDate(data.invoiceDate)}</div>
                <div>Fälligkeitsdatum: {formatDate(data.dueDate)}</div>
                <div>Zahlungsziel: {data.paymentTerms}</div>
              </div>
            </div>
          </div>

          {/* Header Text (Kopftext) */}
          {data.headerText && (
            <div
              className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-white border-l-4 rounded-r"
              style={{ borderColor: color }}
            >
              <div className="font-medium text-sm mb-2" style={{ color }}>
                Kopftext
              </div>
              <div
                className="text-sm text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: data.headerText }}
              />
            </div>
          )}
        </div>

        {/* Items Section Seite 1 */}
        <div className="px-6 flex-1">
          <ItemsTable data={data} color={color} variant="standard" />

          {/* Totals und Footer NUR bei einseitigem Modus */}
          {pageMode === 'single' && (
            <>
              {/* Tax Rules und Totals */}
              <div className="flex justify-between items-start gap-8 mb-6 mt-6">
                <div className="flex-1">
                  <div
                    className="p-4 border-l-4 bg-gradient-to-r from-blue-50 to-white rounded-r"
                    style={{ borderColor: color }}
                  >
                    <div className="font-medium text-sm mb-2" style={{ color }}>
                      Steuerliche Behandlung
                    </div>
                    <TaxRulesInfo data={data} color={color} />
                  </div>
                </div>
                <TotalsDisplay data={data} color={color} variant="standard" />
              </div>

              {/* FooterText */}
              <div className="mb-4">
                <FooterText data={data} variant="standard" />
              </div>
            </>
          )}
        </div>

        {/* Footer Seite 1 */}
        <div className="bg-white p-2 mt-auto">
          <SimpleFooter data={data} color={color} />
        </div>
      </div>

      {/* ========= MEHRSEITIG MODUS ========= */}
      {pageMode !== 'single' && (
        <>
          {/* ========= SEITENUMBRUCH (nur bei > 2 Items) ========= */}
          <div
            className="page-break"
            style={{
              pageBreakBefore: 'always',
              breakBefore: 'page',
              pageBreakAfter: 'avoid',
              breakAfter: 'avoid',
              height: '1px',
              clear: 'both',
            }}
          ></div>

          {/* ========= SEITE 2 ========= */}
          <div
            className="flex flex-col"
            style={{
              minHeight: '297mm',
              height: '297mm',
              pageBreakAfter: 'avoid',
              breakAfter: 'avoid',
            }}
          >
            {/* Header Seite 2 */}
            <div className="p-6 pb-4">
              <div
                className="relative mb-8"
                style={{ minHeight: data.companyLogo ? '160px' : '120px' }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold">{data.companyName}</h1>
                    <div className="mt-2">
                      <div className="text-lg font-semibold" style={{ color }}>
                        {data.documentLabel}
                      </div>
                      <div className="text-sm text-gray-600">Nr. {data.invoiceNumber}</div>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {data.companyLogo && (
                      <img
                        src={data.companyLogo}
                        alt={data.companyName}
                        className="h-20 w-auto object-contain"
                        style={{ maxHeight: `${logoSize}px` }}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <div className="font-semibold mb-3" style={{ color }}>
                    Rechnungsempfänger
                  </div>
                  <div className="space-y-2">
                    <div className="font-medium text-lg">{data.customerName}</div>
                    {data.customerAddressParsed.street && (
                      <div>{data.customerAddressParsed.street}</div>
                    )}
                    {(data.customerAddressParsed.postalCode || data.customerAddressParsed.city) && (
                      <div>
                        {data.customerAddressParsed.postalCode} {data.customerAddressParsed.city}
                      </div>
                    )}
                    {data.customerAddressParsed.country && (
                      <div>{data.customerAddressParsed.country}</div>
                    )}
                    {data.customerVatId && (
                      <div className="mt-2 text-sm">USt-IdNr.: {data.customerVatId}</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="font-semibold mb-3" style={{ color }}>
                    Rechnungsdetails
                  </div>
                  <div className="space-y-2">
                    <div>Rechnungsnr.: {data.invoiceNumber}</div>
                    <div>Datum: {formatDate(data.invoiceDate)}</div>
                    <div>Fälligkeitsdatum: {formatDate(data.dueDate)}</div>
                    <div>Zahlungsziel: {data.paymentTerms}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fortsetzung + Totals Seite 2 */}
            <div className="px-6 flex-1">
              <div className="mb-8">
                <div className="text-sm font-semibold mb-2">Fortsetzung - Seite 2</div>
                <div className="text-xs text-gray-600 mb-4">
                  Weitere Details und Zusammenfassung
                </div>
              </div>

              <div className="flex justify-between items-start gap-8 mb-8">
                <div className="flex-1">
                  <div
                    className="p-4 border-l-4 bg-gradient-to-r from-blue-50 to-white"
                    style={{ borderColor: color }}
                  >
                    <div className="font-medium text-sm mb-2" style={{ color }}>
                      Steuerliche Behandlung
                    </div>
                    <TaxRulesInfo data={data} color={color} />
                  </div>
                </div>
                <TotalsDisplay data={data} color={color} variant="standard" />
              </div>

              <FooterText data={data} variant="standard" />
            </div>

            {/* Footer Seite 2 */}
            <div className="bg-white p-2 mt-auto">
              <SimpleFooter data={data} color={color} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
