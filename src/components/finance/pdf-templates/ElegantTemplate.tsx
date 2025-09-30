import React from 'react';
import { formatDate } from '@/lib/utils';
import { ProcessedPDFData } from '@/hooks/pdf/usePDFTemplateData';
import { TaxRulesInfo } from './common/TaxRulesInfo';
import { TotalsDisplay } from './common/TotalsDisplay';
import { ItemsTable } from './common/ItemsTable';
import { BankDetails } from './common/BankDetails';
import { FooterText } from './common/FooterText';
import { SimpleFooter } from './common/SimpleFooter';

interface ElegantTemplateProps {
  data: ProcessedPDFData;
  color: string;
  logoSize: number;
}

export const ElegantTemplate: React.FC<ElegantTemplateProps> = ({
  data,
  color,
  logoSize
}) => {
  return (
    <div className="bg-white w-full max-w-[210mm] mx-auto text-xs" style={{ fontFamily: 'Georgia, serif' }}>
      <style dangerouslySetInnerHTML={{
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
        `
      }} />
      
      {/* ========= SEITE 1 ========= */}
      <div className="pdf-page flex flex-col">
        {/* Elegant Header */}
        <div className="p-6 pb-4">
          <div className="relative mb-8" style={{ minHeight: data.companyLogo ? '160px' : '120px' }}>
            <div className="absolute top-0 left-0 w-full h-1" style={{ background: `linear-gradient(90deg, ${color} 0%, transparent 100%)` }} />
            
            <div className="flex justify-between items-start pt-6">
              <div className="flex-shrink-0">
                {data.companyLogo && (
                  <div className="relative">
                    <img
                      src={data.companyLogo}
                      alt={data.companyName}
                      className="h-20 w-auto object-contain"
                      style={{ maxHeight: `${logoSize}px` }}
                    />
                    <div className="absolute -bottom-2 left-0 w-16 h-0.5" style={{ backgroundColor: color }} />
                  </div>
                )}
              </div>
              
              <div className="text-right">
                <div className="font-light text-2xl text-gray-900 mb-2">{data.companyName}</div>
                <div className="text-xs text-gray-600 leading-relaxed space-y-1">
                  <div>Siedlung am Wald 6</div>
                  <div>18586 Sellin</div>
                  <div>Deutschland</div>
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0">
              <div className="font-light text-3xl" style={{ color }}>{data.documentLabel}</div>
              <div className="w-20 h-0.5 mt-1" style={{ backgroundColor: color }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 mb-8">
            <div>
              <div className="font-light text-lg mb-4" style={{ color }}>Rechnungsempfänger</div>
              <div className="space-y-2">
                <div className="font-medium text-lg">{data.customerName}</div>
                {data.customerAddressParsed.street && <div>{data.customerAddressParsed.street}</div>}
                {(data.customerAddressParsed.postalCode || data.customerAddressParsed.city) && (
                  <div>{data.customerAddressParsed.postalCode} {data.customerAddressParsed.city}</div>
                )}
                {data.customerAddressParsed.country && <div>{data.customerAddressParsed.country}</div>}
                {data.customerVatId && <div className="mt-2 text-sm">USt-IdNr.: {data.customerVatId}</div>}
              </div>
            </div>
            
            <div>
              <div className="font-light text-lg mb-4" style={{ color }}>Rechnungsdetails</div>
              <div className="space-y-1">
                <div>Nr. {data.invoiceNumber}</div>
                <div>Datum: {formatDate(data.invoiceDate)}</div>
                <div>Fälligkeitsdatum: {formatDate(data.dueDate)}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center mb-8">
            <div className="flex-1 h-px" style={{ backgroundColor: color, opacity: 0.3 }} />
            <div className="mx-4">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            </div>
            <div className="flex-1 h-px" style={{ backgroundColor: color, opacity: 0.3 }} />
          </div>
        </div>

        {/* Items Table Seite 1 */}
        <div className="px-6 flex-1">
          <ItemsTable data={data} color={color} variant="elegant" />
        </div>

        {/* Footer Seite 1 */}
        <div className="bg-white p-2 mt-auto">
          <SimpleFooter data={data} />
        </div>
      </div>

      {/* ========= SEITENUMBRUCH ========= */}
      <div className="page-break" style={{ 
        pageBreakBefore: 'always', 
        breakBefore: 'page',
        pageBreakAfter: 'avoid',
        breakAfter: 'avoid',
        height: '1px',
        clear: 'both'
      }}></div>

      {/* ========= SEITE 2 ========= */}
      <div 
        className="pdf-page flex flex-col" 
        style={{ 
          minHeight: '297mm', 
          height: '297mm',
          pageBreakAfter: 'avoid',
          breakAfter: 'avoid'
        }}
      >
        {/* Header Seite 2 */}
        <div className="p-6 pb-4">
          <div className="relative mb-8" style={{ minHeight: data.companyLogo ? '160px' : '120px' }}>
            <div className="absolute top-0 left-0 w-full h-1" style={{ background: `linear-gradient(90deg, ${color} 0%, transparent 100%)` }} />
            
            <div className="flex justify-between items-start pt-6">
              <div className="flex-shrink-0">
                {data.companyLogo && (
                  <div className="relative">
                    <img
                      src={data.companyLogo}
                      alt={data.companyName}
                      className="h-20 w-auto object-contain"
                      style={{ maxHeight: `${logoSize}px` }}
                    />
                    <div className="absolute -bottom-2 left-0 w-16 h-0.5" style={{ backgroundColor: color }} />
                  </div>
                )}
              </div>
              
              <div className="text-right">
                <div className="font-light text-2xl text-gray-900 mb-2">{data.companyName}</div>
                <div className="text-xs text-gray-600 leading-relaxed space-y-1">
                  <div>Siedlung am Wald 6</div>
                  <div>18586 Sellin</div>
                  <div>Deutschland</div>
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0">
              <div className="font-light text-3xl" style={{ color }}>{data.documentLabel}</div>
              <div className="w-20 h-0.5 mt-1" style={{ backgroundColor: color }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 mb-8">
            <div>
              <div className="font-light text-lg mb-4" style={{ color }}>Rechnungsempfänger</div>
              <div className="space-y-2">
                <div className="font-medium text-lg">{data.customerName}</div>
                {data.customerAddressParsed.street && <div>{data.customerAddressParsed.street}</div>}
                {(data.customerAddressParsed.postalCode || data.customerAddressParsed.city) && (
                  <div>{data.customerAddressParsed.postalCode} {data.customerAddressParsed.city}</div>
                )}
                {data.customerAddressParsed.country && <div>{data.customerAddressParsed.country}</div>}
                {data.customerVatId && <div className="mt-2 text-sm">USt-IdNr.: {data.customerVatId}</div>}
              </div>
            </div>
            
            <div>
              <div className="font-light text-lg mb-4" style={{ color }}>Rechnungsdetails</div>
              <div className="space-y-1">
                <div>Nr. {data.invoiceNumber}</div>
                <div>Datum: {formatDate(data.invoiceDate)}</div>
                <div>Fälligkeitsdatum: {formatDate(data.dueDate)}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center mb-8">
            <div className="flex-1 h-px" style={{ backgroundColor: color, opacity: 0.3 }} />
            <div className="mx-4">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            </div>
            <div className="flex-1 h-px" style={{ backgroundColor: color, opacity: 0.3 }} />
          </div>
        </div>

        {/* Fortsetzung + Totals Seite 2 */}
        <div className="px-6 flex-1 flex flex-col">
          <div className="mb-8">
            <div className="text-sm font-semibold mb-2">Fortsetzung - Seite 2</div>
            <div className="text-xs text-gray-600 mb-4">Weitere Details und Zusammenfassung</div>
          </div>

          <div className="flex justify-between items-start gap-8 mb-8">
            <div className="flex-1">
              <div className="bg-gray-50 p-4 rounded border-l-4" style={{ borderColor: color }}>
                <div className="font-medium text-sm mb-2" style={{ color }}>Steuerliche Behandlung</div>
                <TaxRulesInfo data={data} color={color} />
              </div>
            </div>
            <TotalsDisplay data={data} variant="elegant" />
          </div>

          <BankDetails data={data} variant="elegant" />
          <FooterText data={data} variant="elegant" />

          {data.notes && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded" style={{ borderLeftColor: color, borderLeftWidth: '4px' }}>
              <div className="font-semibold text-sm mb-2" style={{ color }}>Hinweise</div>
              <div className="text-sm text-gray-700 italic leading-relaxed whitespace-pre-line">{data.notes}</div>
            </div>
          )}
          
          {/* Spacer um Footer nach unten zu drücken */}
          <div className="flex-1"></div>
        </div>

        {/* Footer Seite 2 - UNTEN */}
        <div className="mt-auto p-2 bg-white">
          <SimpleFooter data={data} />
        </div>
      </div>
      
    </div>
  );
};