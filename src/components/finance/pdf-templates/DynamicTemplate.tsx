import React from 'react';
import { formatDate } from '@/lib/utils';
import { ProcessedPDFData } from '@/hooks/pdf/usePDFTemplateData';
import { TaxRulesInfo } from './common/TaxRulesInfo';
import { TotalsDisplay } from './common/TotalsDisplay';
import { ItemsTable } from './common/ItemsTable';

import { FooterText } from './common/FooterText';
import { SimpleFooter } from './common/SimpleFooter';
import { DocumentType, getDocumentTypeConfig, detectDocumentType } from '@/lib/document-utils';

interface DynamicTemplateProps {
  data: ProcessedPDFData;
  color: string;
  logoSize: number;
  pageMode?: 'single' | 'multi';
  documentType?: DocumentType;
}

export const DynamicTemplate: React.FC<DynamicTemplateProps> = ({
  data,
  color,
  logoSize,
  pageMode = 'multi',
  documentType,
}) => {
  // 📋 DYNAMISCHE DOKUMENTTYP-KONFIGURATION
  const detectedType = documentType || detectDocumentType(data);
  const config = getDocumentTypeConfig(detectedType, color);
  return (
    <div
      className="bg-white w-full max-w-[210mm] mx-auto text-xs overflow-hidden relative"
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
          .dynamic-bg {
            background: linear-gradient(135deg, ${color}10 0%, ${color}05 50%, transparent 100%);
          }
          .dynamic-shape {
            position: absolute;
            background: ${color}15;
            border-radius: 50%;
          }
          .dynamic-accent {
            background: linear-gradient(45deg, ${color} 0%, ${color}80 100%);
          }
        `,
        }}
      />

      {/* ========= SEITE 1 ========= */}
      <div className="pdf-page flex flex-col dynamic-bg">
        {/* Dynamic shapes background */}
        <div
          className="dynamic-shape"
          style={{ width: '200px', height: '200px', top: '-50px', right: '-50px', opacity: 0.1 }}
        />
        <div
          className="dynamic-shape"
          style={{ width: '100px', height: '100px', top: '100px', left: '-30px', opacity: 0.08 }}
        />
        <div
          className="dynamic-shape"
          style={{ width: '150px', height: '150px', bottom: '50px', right: '20px', opacity: 0.06 }}
        />

        {/* Dynamic Header Seite 1 */}
        <div className="p-6 pb-4 relative z-10">
          <div
            className="relative mb-8"
            style={{ minHeight: data.companyLogo ? '160px' : '120px' }}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <div className="dynamic-accent text-white p-4 rounded-r-full pr-8 inline-block">
                  <h1 className="text-2xl font-bold">{data.companyName}</h1>
                </div>
                <div className="mt-2 ml-4">
                  <div className="text-lg font-semibold" style={{ color }}>
                    {data.documentLabel}
                  </div>
                  <div className="text-sm text-gray-600">Nr. {data.invoiceNumber}</div>
                </div>
              </div>

              <div className="flex-shrink-0">
                {data.companyLogo && (
                  <div className="relative">
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: color, opacity: 0.1 }}
                    />
                    <img
                      src={data.companyLogo}
                      alt={data.companyName}
                      className="relative h-20 w-auto object-contain p-2"
                      style={{ maxHeight: `${logoSize}px` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div
              className="bg-white/70 backdrop-blur-sm p-4 rounded-lg border-l-4"
              style={{ borderColor: color }}
            >
              <div className="font-semibold mb-3 text-lg" style={{ color }}>
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

            <div
              className="bg-white/70 backdrop-blur-sm p-4 rounded-lg border-l-4"
              style={{ borderColor: color }}
            >
              <div className="font-semibold mb-3 text-lg" style={{ color }}>
                Rechnungsdetails
              </div>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">Datum:</span> {formatDate(data.invoiceDate)}
                </div>
                <div>
                  <span className="font-medium">Fälligkeitsdatum:</span> {formatDate(data.dueDate)}
                </div>
                <div>
                  <span className="font-medium">Zahlungsziel:</span> {data.paymentTerms}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center mb-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
            <div className="mx-4">
              <div className="w-3 h-3 rounded-full dynamic-accent" />
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
          </div>
        </div>

        {/* Items Table Seite 1 */}
        <div className="px-6 flex-1">
          <ItemsTable data={data} color={color} variant="dynamic" />

          {/* Totals und Footer NUR bei einseitigem Modus */}
          {pageMode === 'single' && (
            <>
              {/* Totals */}
              <div className="flex justify-between items-start gap-8 mb-8 mt-8">
                <div className="flex-1 space-y-4">
                  <TaxRulesInfo data={data} color={color} />
                </div>
                <TotalsDisplay data={data} color={color} variant="standard" />
              </div>

              {/* FooterText */}
              <FooterText data={data} variant="standard" />
            </>
          )}
        </div>

        {/* FOOTER SEITE 1 */}
        <div className="bg-white p-2 mt-4">
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
            className="flex flex-col dynamic-bg"
            style={{
              minHeight: '297mm',
              height: '297mm',
              pageBreakAfter: 'avoid',
              breakAfter: 'avoid',
            }}
          >
            {/* Dynamic shapes background Seite 2 */}
            <div
              className="dynamic-shape"
              style={{
                width: '180px',
                height: '180px',
                top: '-40px',
                left: '-40px',
                opacity: 0.08,
              }}
            />
            <div
              className="dynamic-shape"
              style={{
                width: '120px',
                height: '120px',
                top: '80px',
                right: '-20px',
                opacity: 0.06,
              }}
            />
            <div
              className="dynamic-shape"
              style={{
                width: '90px',
                height: '90px',
                bottom: '100px',
                left: '30px',
                opacity: 0.04,
              }}
            />

            {/* Header Seite 2 */}
            <div className="p-6 pb-4 relative z-10">
              <div
                className="relative mb-8"
                style={{ minHeight: data.companyLogo ? '160px' : '120px' }}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1">
                    <div className="dynamic-accent text-white p-4 rounded-r-full pr-8 inline-block">
                      <h1 className="text-2xl font-bold">{data.companyName}</h1>
                    </div>
                    <div className="mt-2 ml-4">
                      <div className="text-lg font-semibold" style={{ color }}>
                        {data.documentLabel}
                      </div>
                      <div className="text-sm text-gray-600">Nr. {data.invoiceNumber}</div>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {data.companyLogo && (
                      <div className="relative">
                        <div
                          className="absolute inset-0 rounded-full"
                          style={{ backgroundColor: color, opacity: 0.1 }}
                        />
                        <img
                          src={data.companyLogo}
                          alt={data.companyName}
                          className="relative h-20 w-auto object-contain p-2"
                          style={{ maxHeight: `${logoSize}px` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8">
                <div
                  className="bg-white/70 backdrop-blur-sm p-4 rounded-lg border-l-4"
                  style={{ borderColor: color }}
                >
                  <div className="font-semibold mb-3 text-lg" style={{ color }}>
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

                <div
                  className="bg-white/70 backdrop-blur-sm p-4 rounded-lg border-l-4"
                  style={{ borderColor: color }}
                >
                  <div className="font-semibold mb-3 text-lg" style={{ color }}>
                    Rechnungsdetails
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Datum:</span> {formatDate(data.invoiceDate)}
                    </div>
                    <div>
                      <span className="font-medium">Fälligkeitsdatum:</span>{' '}
                      {formatDate(data.dueDate)}
                    </div>
                    <div>
                      <span className="font-medium">Zahlungsziel:</span> {data.paymentTerms}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center mb-6">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                <div className="mx-4">
                  <div className="w-3 h-3 rounded-full dynamic-accent" />
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
              </div>
            </div>

            {/* Fortsetzung + Totals Seite 2 */}
            <div className="px-6 flex-1 relative z-10">
              <div className="mb-8">
                <div className="text-sm font-semibold mb-2">Fortsetzung - Seite 2</div>
                <div className="text-xs text-gray-600 mb-4">
                  Weitere Details und Zusammenfassung
                </div>
              </div>

              <div className="flex justify-between items-start gap-8 mb-8">
                <div className="flex-1">
                  <div
                    className="bg-white/80 backdrop-blur-sm p-4 rounded-lg border-l-4"
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

              {data.notes && (
                <div
                  className="mt-4 bg-white/80 backdrop-blur-sm p-4 rounded-lg border-l-4"
                  style={{ borderColor: color }}
                >
                  <div className="font-semibold text-sm mb-2" style={{ color }}>
                    Hinweise
                  </div>
                  <div className="text-sm text-gray-700 whitespace-pre-line">{data.notes}</div>
                </div>
              )}
            </div>

            {/* Footer Seite 2 */}
            <div className="bg-white p-2 mt-3 relative z-10">
              <SimpleFooter data={data} color={color} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
