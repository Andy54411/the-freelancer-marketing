import React from 'react';
import { formatDate } from '@/lib/utils';
import { ProcessedPDFData } from '@/hooks/pdf/usePDFTemplateData';
import { TaxRulesInfo } from './common/TaxRulesInfo';
import { TotalsDisplay } from './common/TotalsDisplay';
import { ItemsTable } from './common/ItemsTable';
import { FooterText } from './common/FooterText';
import { SimpleFooter } from './common/SimpleFooter';
import { DocumentType, detectDocumentType, getDocumentTypeConfig } from '@/lib/document-utils';

interface NeutralTemplateProps {
  data: ProcessedPDFData;
  color: string;
  logoSize: number;
  pageMode?: 'single' | 'multi';
  documentType?: DocumentType;
}

export const NeutralTemplate: React.FC<NeutralTemplateProps> = ({
  data,
  color,
  logoSize,
  pageMode = 'multi',
  documentType = 'invoice',
}) => {
  // DEBUG: Log pageMode to see what we actually receive
  console.log('🎯 NeutralTemplate received pageMode:', pageMode);
  
  // 📋 DYNAMISCHE DOKUMENTTYP-KONFIGURATION mit centraler document-utils
  const detectedType = detectDocumentType(data) || documentType || 'invoice';
  const config = getDocumentTypeConfig(detectedType, color);
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
    step4: (data as any).step4,
  };

  return (
    <div
      className={`bg-white w-full max-w-[210mm] mx-auto ${pageMode === 'single' ? 'text-[10px] leading-tight' : 'text-xs'}`}
      style={{
        fontFamily: 'Arial, sans-serif',
        ...(pageMode === 'single' && { maxHeight: '297mm', overflow: 'hidden' }),
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @page { size: A4; margin: 0; }
          .pdf-page {
            width: 210mm;
          }
        `,
        }}
      />

      {/* ========= SEITE 1 ========= */}
      <div className="flex flex-col" style={{ minHeight: '297mm' }}>
        {/* Simple Header - Seite 1 */}
        <div className="p-6 pb-4">
          <div
            className="border-b-2 pb-6 mb-8"
            style={{ minHeight: data.companyLogo ? '120px' : '80px', borderColor: config.color }}
          >
            <div className="flex justify-between items-start">
              {/* Firmenlogo links */}
              <div className="flex-shrink-0">
                {data.companyLogo && (
                  <img
                    src={data.companyLogo}
                    alt={data.companyName}
                    className="h-16 w-auto object-contain"
                    style={{ maxHeight: `${logoSize}px` }}
                  />
                )}
                <h1 className="text-2xl font-medium mb-2 mt-4">{config.title}</h1>
                <p className="text-gray-700">{config.numberLabel}: {data.invoiceNumber}</p>
              </div>

              {/* Firmendaten rechts */}
              <div className="text-right text-xs text-gray-700 leading-relaxed">
                <div className="font-bold text-lg text-gray-900">{data.companyName}</div>
                {data.companyAddressParsed.street && <div>{data.companyAddressParsed.street}</div>}
                {(data.companyAddressParsed.postalCode || data.companyAddressParsed.city) && (
                  <div>
                    {data.companyAddressParsed.postalCode} {data.companyAddressParsed.city}
                  </div>
                )}
                {data.companyAddressParsed.country && (
                  <div>{data.companyAddressParsed.country}</div>
                )}
                {data.companyPhone && <div>Tel.: {data.companyPhone}</div>}
                {data.companyEmail && <div>E-Mail: {data.companyEmail}</div>}
                {data.companyWebsite && <div>Web: {data.companyWebsite}</div>}
              </div>
            </div>
          </div>

          {/* Customer and Document Info */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <div className="font-semibold mb-2">{config.recipientLabel}:</div>
              <div className="space-y-1">
                <div className="font-medium">{data.customerName}</div>
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
                {data.customerVatId && <div>USt-IdNr.: {data.customerVatId}</div>}
              </div>
            </div>

            <div>
              <div className="font-semibold mb-2">Dokumentdetails:</div>
              <div className="space-y-1">
                <div>{config.numberLabel}: {data.invoiceNumber}</div>
                <div>{config.dateLabel}: {formatDate(data.invoiceDate)}</div>
                {config.showDueDate && (
                  <div>{config.dueDateLabel}: {formatDate(data.dueDate)}</div>
                )}
                {config.showPaymentTerms && (
                  <div>Zahlungsziel: {data.paymentTerms}</div>
                )}
              </div>
            </div>
          </div>

          {/* Header Text (Kopftext) */}
          {data.headerText && (
            <div
              className="mb-6 p-4 bg-gray-50 rounded-lg border-l-4"
              style={{ borderColor: config.color }}
            >
              <div
                className="text-sm text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: data.headerText }}
              />
            </div>
          )}

          <div className="border-t-2 mb-4" style={{ borderColor: color }}></div>
        </div>

        {/* Items Table Seite 1 */}
        <div className="px-6 flex-1">
          <ItemsTable data={data} color={config.color} variant="neutral" />

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
              <FooterText data={data} variant="standard" documentType={detectedType} />
            </>
          )}
        </div>

        {/* FOOTER auf Seite 1 - IMMER bei Single, AUCH bei Multi */}
        <div className="bg-white p-2 mt-1">
          <SimpleFooter data={data} color={color} />
        </div>
      </div>

      {/* ========= AUTOMATISCHE EIN-/MEHRSEITIG LOGIK ========= */}
      {/* Zweite Seite IMMER bei mehrseitigem Modus */}
      {pageMode !== 'single' && (
        <>
          {/* ========= SEITENUMBRUCH ========= */}
          <div style={{ pageBreakBefore: 'always', height: '0' }}></div>

          {/* ========= SEITE 2 (nur bei > 3 Items) ========= */}
          <div
            className="flex flex-col bg-white"
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
                className="border-b-2 pb-6 mb-8"
                style={{ minHeight: data.companyLogo ? '120px' : '80px', borderColor: color }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-shrink-0">
                    {data.companyLogo && (
                      <img
                        src={data.companyLogo}
                        alt={data.companyName}
                        className="h-16 w-auto object-contain"
                        style={{ maxHeight: `${logoSize}px` }}
                      />
                    )}
                    <h1 className="text-2xl font-medium mb-2 mt-4">{data.documentLabel}</h1>
                    <p className="text-gray-700">Nr. {data.invoiceNumber}</p>
                  </div>

                  <div className="text-right text-xs text-gray-700 leading-relaxed">
                    <div className="font-bold text-lg text-gray-900">{data.companyName}</div>
                    {data.companyAddressParsed.street && (
                      <div>{data.companyAddressParsed.street}</div>
                    )}
                    {(data.companyAddressParsed.postalCode || data.companyAddressParsed.city) && (
                      <div>
                        {data.companyAddressParsed.postalCode} {data.companyAddressParsed.city}
                      </div>
                    )}
                    {data.companyAddressParsed.country && (
                      <div>{data.companyAddressParsed.country}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <div className="font-semibold mb-2">Rechnungsempfänger:</div>
                  <div className="space-y-1">
                    <div className="font-medium">{data.customerName}</div>
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
                    {data.customerVatId && <div>USt-IdNr.: {data.customerVatId}</div>}
                  </div>
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

              <div className="border-t-2 mb-4" style={{ borderColor: color }}></div>
            </div>

            {/* Fortsetzung + Totals Seite 2 */}
            <div className="px-6 flex-1">
              <div className="mb-8">
                <div className="text-sm font-semibold mb-2">Fortsetzung - Seite 2</div>
                <div className="text-xs text-gray-600 mb-4">
                  Weitere Details und Zusammenfassung
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-between items-start gap-8 mb-8">
                <div className="flex-1 space-y-4">
                  <TaxRulesInfo data={data} color={color} />
                </div>
                <TotalsDisplay data={data} color={color} variant="standard" />
              </div>

              <FooterText data={data} variant="standard" documentType={detectedType} />
            </div>

            {/* SPACER um Seite zu füllen */}
            <div className="flex-1 bg-white"></div>

            {/* === FOOTER AM ENDE DER LETZTEN SEITE === */}
            <div className="bg-white p-2">
              <SimpleFooter data={data} color={color} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
