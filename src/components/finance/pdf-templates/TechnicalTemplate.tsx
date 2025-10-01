import React from 'react';
import { formatDate } from '@/lib/utils';
import { ProcessedPDFData } from '@/hooks/pdf/usePDFTemplateData';
import { TaxRulesInfo } from './common/TaxRulesInfo';
import { TotalsDisplay } from './common/TotalsDisplay';
import { ItemsTable } from './common/ItemsTable';

import { FooterText } from './common/FooterText';
import { SimpleFooter } from './common/SimpleFooter';

interface TechnicalTemplateProps {
  data: ProcessedPDFData;
  color: string;
  logoSize: number;
  pageMode?: 'single' | 'multi';
}

export const TechnicalTemplate: React.FC<TechnicalTemplateProps> = ({
  data,
  color,
  logoSize,
  pageMode = 'multi',
}) => {
  return (
    <div
      className="bg-white w-full max-w-[210mm] mx-auto text-xs font-mono"
      style={{ fontFamily: 'Courier New, monospace' }}
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
        {/* Technical Header Seite 1 */}
        <div
          className="bg-gray-900 text-white p-3 mb-4"
          style={{ minHeight: data.companyLogo ? '100px' : '80px' }}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="text-lg font-bold">{data.companyName}</div>
              <div className="text-sm opacity-75">Professional Services</div>
            </div>

            {data.companyLogo && (
              <img
                src={data.companyLogo}
                alt={data.companyName}
                className="h-12 w-auto object-contain"
                style={{
                  maxHeight: `${Math.min(logoSize, 48)}px`,
                  filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.8))',
                }}
              />
            )}
          </div>

          <div className="mt-4">
            <div className="text-lg font-bold" style={{ color }}>
              {data.documentLabel}
            </div>
            <div className="text-sm">#{data.invoiceNumber}</div>
            <div className="text-sm">{formatDate(data.invoiceDate)}</div>
          </div>
        </div>

        {/* Customer Info Seite 1 */}
        <div className="p-4 pb-2">
          <div className="grid grid-cols-2 gap-6 mb-4 border" style={{ borderColor: color }}>
            <div className="p-4">
              <div className="font-bold mb-2 border-b pb-1" style={{ borderColor: color }}>
                CLIENT_INFO:
              </div>
              <div className="space-y-1">
                <div>NAME: {data.customerName}</div>
                {data.customerAddressParsed.street && (
                  <div>ADDR1: {data.customerAddressParsed.street}</div>
                )}
                {(data.customerAddressParsed.postalCode || data.customerAddressParsed.city) && (
                  <div>
                    ADDR2: {data.customerAddressParsed.postalCode} {data.customerAddressParsed.city}
                  </div>
                )}
                {data.customerAddressParsed.country && (
                  <div>COUNTRY: {data.customerAddressParsed.country}</div>
                )}
                {data.customerVatId && <div>VAT_ID: {data.customerVatId}</div>}
              </div>
            </div>

            <div className="p-4">
              <div className="font-bold mb-2 border-b pb-1" style={{ borderColor: color }}>
                DOC_META:
              </div>
              <div className="space-y-1">
                <div>DOC_NUM: {data.invoiceNumber}</div>
                <div>ISSUED: {formatDate(data.invoiceDate)}</div>
                <div>DUE_DATE: {formatDate(data.dueDate)}</div>
                <div>TERMS: {data.paymentTerms}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Header Text (Kopftext) */}
        {data.headerText && (
          <div className="mx-4 mb-2 p-2 bg-gray-50 border" style={{ borderColor: color }}>
            <div className="font-bold mb-1 border-b pb-1" style={{ borderColor: color }}>
              HEADER_TEXT:
            </div>
            <div
              className="text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: data.headerText }}
            />
          </div>
        )}

        {/* Items Table Seite 1 */}
        <div className="px-4 flex-1">
          <div className="border mb-3" style={{ borderColor: color }}>
            <div className="bg-gray-100 p-2 border-b" style={{ borderColor: color }}>
              <div className="font-bold">SERVICES_LIST:</div>
            </div>
            <div className="p-2">
              <ItemsTable data={data} color={color} variant="technical" />
            </div>
          </div>

          {/* Totals und Footer NUR bei einseitigem Modus */}
          {pageMode === 'single' && (
            <>
              {/* Tax Rules und Totals */}
              <div className="flex justify-between items-start gap-4 mb-3">
                <div className="flex-1">
                  <div className="border p-2" style={{ borderColor: color }}>
                    <div className="font-bold mb-2 border-b pb-1" style={{ borderColor: color }}>
                      TAX_INFO:
                    </div>
                    <TaxRulesInfo data={data} color={color} />
                  </div>
                </div>
                <div className="border" style={{ borderColor: color }}>
                  <div className="bg-gray-100 p-2 border-b" style={{ borderColor: color }}>
                    <div className="font-bold">TOTALS:</div>
                  </div>
                  <div className="p-3">
                    <TotalsDisplay data={data} color={color} variant="technical" />
                  </div>
                </div>
              </div>

              {/* FooterText */}
              <div className="border p-2 mb-2" style={{ borderColor: color }}>
                <div className="font-bold mb-1 border-b pb-1" style={{ borderColor: color }}>
                  FOOTER_INFO:
                </div>
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
          <div className="pdf-page flex flex-col">
            {/* Header Seite 2 */}
            <div
              className="bg-gray-900 text-white p-4 mb-8"
              style={{ minHeight: data.companyLogo ? '140px' : '100px' }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-lg font-bold">{data.companyName}</div>
                  <div className="text-sm opacity-75">Professional Services</div>
                </div>

                {data.companyLogo && (
                  <img
                    src={data.companyLogo}
                    alt={data.companyName}
                    className="h-16 w-auto object-contain"
                    style={{
                      maxHeight: `${logoSize}px`,
                      filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.8))',
                    }}
                  />
                )}
              </div>

              <div className="mt-6 flex justify-between">
                <div>
                  <div className="text-xl font-bold" style={{ color }}>
                    {data.documentLabel}
                  </div>
                  <div className="text-sm">#{data.invoiceNumber}</div>
                </div>
              </div>
            </div>

            {/* Customer Info Seite 2 */}
            <div className="p-6 pb-4">
              <div className="grid grid-cols-2 gap-8 mb-8 border" style={{ borderColor: color }}>
                <div className="p-4">
                  <div className="font-bold mb-2 border-b pb-1" style={{ borderColor: color }}>
                    CLIENT_INFO:
                  </div>
                  <div className="space-y-1">
                    <div>NAME: {data.customerName}</div>
                    {data.customerAddressParsed.street && (
                      <div>ADDR1: {data.customerAddressParsed.street}</div>
                    )}
                    {(data.customerAddressParsed.postalCode || data.customerAddressParsed.city) && (
                      <div>
                        ADDR2: {data.customerAddressParsed.postalCode}{' '}
                        {data.customerAddressParsed.city}
                      </div>
                    )}
                    {data.customerAddressParsed.country && (
                      <div>COUNTRY: {data.customerAddressParsed.country}</div>
                    )}
                    {data.customerVatId && <div>VAT_ID: {data.customerVatId}</div>}
                  </div>
                </div>

                <div className="p-4">
                  <div className="font-bold mb-2 border-b pb-1" style={{ borderColor: color }}>
                    DOC_META:
                  </div>
                  <div className="space-y-1">
                    <div>DOC_NUM: {data.invoiceNumber}</div>
                    <div>ISSUED: {formatDate(data.invoiceDate)}</div>
                    <div>DUE_DATE: {formatDate(data.dueDate)}</div>
                    <div>TERMS: {data.paymentTerms}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fortsetzung + Totals Seite 2 */}
            <div className="px-6 flex-1">
              <div className="border mb-8" style={{ borderColor: color }}>
                <div className="bg-gray-100 p-2 border-b" style={{ borderColor: color }}>
                  <div className="font-bold">SUMMARY_DATA:</div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start gap-8">
                    <div className="flex-1">
                      <div className="border p-4" style={{ borderColor: color }}>
                        <div className="font-bold mb-2">TAX_RULES:</div>
                        <TaxRulesInfo data={data} color={color} />
                      </div>
                    </div>
                    <TotalsDisplay data={data} color={color} variant="technical" />
                  </div>
                </div>
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
