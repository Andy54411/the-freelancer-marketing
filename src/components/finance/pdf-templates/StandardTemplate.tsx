import React from 'react';
import { formatDate } from '@/lib/utils';
import { ProcessedPDFData } from '@/hooks/pdf/usePDFTemplateData';
import { InvoiceFooter } from './common/InvoiceFooter';
import { TaxRulesInfo } from './common/TaxRulesInfo';
import { TotalsDisplay } from './common/TotalsDisplay';
import { ItemsTable } from './common/ItemsTable';
import { BankDetails } from './common/BankDetails';
import { FooterText } from './common/FooterText';
import { PDFSection } from './common/PDFSection';
import { SimpleFooter } from './common/SimpleFooter';

interface StandardTemplateProps {
  data: ProcessedPDFData;
  color: string;
  logoSize: number;
}

export const StandardTemplate: React.FC<StandardTemplateProps> = ({
  data,
  color,
  logoSize
}) => {
  // Footer-Daten - ECHTE Daten verwenden, KEINE Fallbacks!
  const footerData = {
    companyName: (data as any).companyName,
    phoneNumber: (data as any).phoneNumber,
    email: (data as any).contactEmail,
    website: (data as any).companyWebsiteForBackend || (data as any).website,
    vatId: (data as any).vatId,
    taxNumber: (data as any).taxNumber,
    companyRegister: (data as any).registrationNumber,
    iban: (data as any).step4?.iban,
    bic: (data as any).step4?.bic,
    companySuffix: (data as any).step2?.companySuffix,
    legalForm: (data as any).legalForm || (data as any).step2?.legalForm,
    districtCourt: (data as any).districtCourt || (data as any).step3?.districtCourt,
    managingDirectors: (data as any).step1?.managingDirectors || [],
    firstName: (data as any).step1?.personalData?.firstName,
    lastName: (data as any).step1?.personalData?.lastName,
    companyStreet: (data as any).companyStreet,
    companyHouseNumber: (data as any).companyHouseNumber,
    companyPostalCode: (data as any).companyPostalCode,
    companyCity: (data as any).companyCity,
    step1: (data as any).step1,
    step2: (data as any).step2,  
    step4: (data as any).step4
  };

  return (
    <div className="bg-white w-full max-w-[210mm] mx-auto text-xs" style={{ 
      fontFamily: 'Arial, sans-serif'
    }}>
      <style dangerouslySetInnerHTML={{
        __html: `
          @page { size: A4; margin: 0; }
          @media print {
            .force-page-break {
              page-break-before: always !important;
              break-before: page !important;
              display: block !important;
              height: 1px !important;
              width: 100% !important;
            }
          }
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
        {/* HEADER SEITE 1 */}
        <div className="p-6 pb-4">
          <div className="relative mb-4">
            <div 
              className="absolute top-0 left-0 w-full h-2" 
              style={{ backgroundColor: color }}
            />
            <div className="pt-6 flex justify-between items-start" style={{ minHeight: data.companyLogo ? '160px' : '80px' }}>
              <div className="text-left flex-shrink-0">
                <div className="text-2xl font-bold mb-2">{data.documentLabel}</div>
              </div>
              
              <div className="flex-1 flex justify-end">
                <div className={data.companyLogo ? "mb-4" : ""} style={{ height: data.companyLogo ? '100px' : '0px', display: 'flex', alignItems: 'center' }}>
                  {data.companyLogo && (
                    <img 
                      src={data.companyLogo} 
                      alt="Logo" 
                      style={{ 
                        height: `${Math.max(logoSize * 1.2, 50)}px`,
                        maxHeight: '100px',
                        width: 'auto'
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <div className="font-semibold mb-2">Rechnungsempfänger:</div>
              <div className="font-medium">{data.customerName}</div>
              <div className="text-gray-600 mt-1">
                <div>{data.customerAddressParsed.street}</div>
                <div>{data.customerAddressParsed.postalCode} {data.customerAddressParsed.city}</div>
                <div>{data.customerAddressParsed.country}</div>
              </div>
              {data.customerVatId && <div className="text-gray-600 mt-1">USt-IdNr.: {data.customerVatId}</div>}
            </div>
            
            <div>
              <div className="font-semibold mb-2">Rechnungsdetails:</div>
              <div className="space-y-1">
                <div>Nr. {data.invoiceNumber}</div>
                <div>Rechnungsdatum: {formatDate(data.invoiceDate)}</div>
                <div>Fälligkeitsdatum: {formatDate(data.dueDate)}</div>
              </div>
            </div>
          </div>

          <div className="border-t-2 mb-4" style={{ borderColor: '#14ad9f' }}></div>
        </div>

        {/* TABELLE SEITE 1 */}
        <div className="px-6 flex-1">
          <ItemsTable data={data} />
        </div>

        {/* FOOTER SEITE 1 */}
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
        className="flex flex-col no-page-break" 
        style={{ 
          minHeight: '297mm', 
          height: '297mm',
          pageBreakAfter: 'avoid',
          breakAfter: 'avoid'
        }}
      >
        {/* HEADER SEITE 2 */}
        <div className="p-6 pb-4">
          <div className="relative mb-4">
            <div 
              className="absolute top-0 left-0 w-full h-2" 
              style={{ backgroundColor: color }}
            />
            <div className="pt-6 flex justify-between items-start" style={{ minHeight: data.companyLogo ? '160px' : '80px' }}>
              <div className="text-left flex-shrink-0">
                <div className="text-2xl font-bold mb-2">{data.documentLabel}</div>
              </div>
              
              <div className="flex-1 flex justify-end">
                <div className={data.companyLogo ? "mb-4" : ""} style={{ height: data.companyLogo ? '100px' : '0px', display: 'flex', alignItems: 'center' }}>
                  {data.companyLogo && (
                    <img 
                      src={data.companyLogo} 
                      alt="Logo" 
                      style={{ 
                        height: `${Math.max(logoSize * 1.2, 50)}px`,
                        maxHeight: '100px',
                        width: 'auto'
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Rechnungsempfänger und Details auch auf Seite 2 */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <div className="font-semibold mb-2">Rechnungsempfänger:</div>
              <div className="font-medium">{data.customerName}</div>
              <div className="text-gray-600 mt-1">
                <div>{data.customerAddressParsed.street}</div>
                <div>{data.customerAddressParsed.postalCode} {data.customerAddressParsed.city}</div>
                <div>{data.customerAddressParsed.country}</div>
              </div>
              {data.customerVatId && <div className="text-gray-600 mt-1">USt-IdNr.: {data.customerVatId}</div>}
            </div>
            
            <div>
              <div className="font-semibold mb-2">Rechnungsdetails:</div>
              <div className="space-y-1">
                <div>Nr. {data.invoiceNumber}</div>
                <div>Rechnungsdatum: {formatDate(data.invoiceDate)}</div>
                <div>Fälligkeitsdatum: {formatDate(data.dueDate)}</div>
              </div>
            </div>
          </div>

          <div className="border-t-2 mb-4" style={{ borderColor: '#14ad9f' }}></div>
        </div>

        {/* WEITERFÜHRENDE TABELLE + TOTALS + FOOTERTEXT */}
        <div className="px-6 flex-1">
          {/* Fortsetzung Tabelle falls nötig - für Test sichtbarer Inhalt */}
          <div className="mb-8">
            <div className="text-sm font-semibold mb-2">Fortsetzung - Seite 2</div>
            <div className="text-xs text-gray-600 mb-4">Weitere Details und Zusammenfassung</div>
          </div>

          {/* TOTALS */}
          <div className="flex justify-between items-start gap-8 mb-8">
            <div className="flex-1 space-y-4">
              <TaxRulesInfo data={data} color={color} />
            </div>
            <TotalsDisplay data={data} variant="standard" />
          </div>

          <BankDetails data={data} variant="standard" />
          <FooterText data={data} variant="standard" />

          {data.notes && (
            <div className="mt-4 p-3 bg-white border border-gray-200 rounded">
              <div className="font-semibold text-sm text-black mb-1">Hinweise:</div>
              <div className="text-xs text-gray-700">{data.notes}</div>
            </div>
          )}
        </div>

        {/* FOOTER SEITE 2 */}
        <div className="bg-white p-2 mt-auto">
          <SimpleFooter data={data} />
        </div>
      </div>
      
    </div>
  );
};