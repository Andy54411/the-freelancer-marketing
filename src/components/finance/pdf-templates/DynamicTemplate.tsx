import React from 'react';
import { formatDate } from '@/lib/utils';
import { ProcessedPDFData, DocumentSettings } from '@/hooks/pdf/usePDFTemplateData';
import { TaxRulesInfo } from './common/TaxRulesInfo';
import { TotalsDisplay } from './common/TotalsDisplay';
import { ItemsTable } from './common/ItemsTable';
import { FooterText } from './common/FooterText';
import { SimpleFooter } from './common/SimpleFooter';
import type { DocumentType } from '@/lib/document-utils';
import { getDocumentTypeConfig, detectDocumentType } from '@/lib/document-utils';
import { useDocumentTranslation } from '@/hooks/pdf/useDocumentTranslation';

interface DynamicTemplateProps {
  data: ProcessedPDFData;
  color: string;
  logoSize: number;
  pageMode?: 'single' | 'multi';
  documentType?: DocumentType;
  documentSettings?: DocumentSettings;
}

export const DynamicTemplate: React.FC<DynamicTemplateProps> = ({
  data,
  color,
  logoSize,
  pageMode = 'multi',
  documentType,
  documentSettings,
}) => {
  // 📋 DYNAMISCHE DOKUMENTTYP-KONFIGURATION
  // PRIORITÄT: Explizit übergebener documentType hat höchste Priorität
  const detectedType = documentType || detectDocumentType(data) || 'invoice';
  const _config = getDocumentTypeConfig(detectedType, color);

  // Übersetzungsfunktion
  const { t } = useDocumentTranslation(documentSettings?.language || 'de');

  // Berechne, ob eine zweite Seite benötigt wird
  // STANDARD: Immer einseitig, außer der Inhalt ist zu lang
  const itemCount = data.items?.length || 0;
  const hasLongDescription = data.items?.some((item: { description?: string }) => (item.description?.length || 0) > 150) || false;
  const hasHeaderText = !!(data.processedHeaderText || data.processedHeadTextHtml);
  const needsSecondPage = (itemCount > 6 || (itemCount > 4 && hasLongDescription) || (itemCount > 5 && hasHeaderText));

  return (
    <div
      className={`bg-white w-full mx-auto ${pageMode === 'single' ? 'text-[10px] leading-tight' : 'text-xs'} overflow-hidden relative`}
      style={{
        fontFamily: 'Arial, sans-serif',
        width: '794px',
        maxWidth: '794px',
        ...(pageMode === 'single' && { maxHeight: '1123px', overflow: 'hidden' }),
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            .pdf-page { page-break-before: always; }
            body { margin: 0; padding: 0; }
          }
          ${
            documentSettings?.showFoldLines
              ? `
          .pdf-page::before {
            content: '';
            position: absolute;
            left: 0;
            top: 105mm;
            width: 5mm;
            height: 1px;
            background-color: #ccc;
            z-index: 100;
          }
          .pdf-page::after {
            content: '';
            position: absolute;
            left: 0;
            top: 210mm;
            width: 5mm;
            height: 1px;
            background-color: #ccc;
            z-index: 100;
          }
          .pdf-page .fold-mark-hole {
            position: absolute;
            left: 0;
            top: 148.5mm;
            width: 3mm;
            height: 3mm;
            border: 1px solid #ccc;
            border-radius: 50%;
            z-index: 100;
          }
          `
              : ''
          }
          /* Dynamic Template Styles */
          .dynamic-bg {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          }
          .dynamic-shape {
            position: absolute;
            border-radius: 50%;
            background: ${color};
            opacity: 0.05;
            z-index: 0;
          }
          .dynamic-accent {
            background-color: ${color};
          }
        `,
        }}
      />

      {/* ========= SEITE 1 ========= */}
      <div className="pdf-page flex flex-col dynamic-bg" style={{ minHeight: '1123px' }}>
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

              <div className="shrink-0">
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
                {t('recipient')}
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
                  <div className="mt-2 text-sm">
                    {t('vatId')}: {data.customerVatId}
                  </div>
                )}
              </div>
            </div>

            <div
              className="bg-white/70 backdrop-blur-sm p-4 rounded-lg border-l-4"
              style={{ borderColor: color }}
            >
              <div className="font-semibold mb-3 text-lg" style={{ color }}>
                {t('documentDetails')}
              </div>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">{t('date')}:</span> {formatDate(data.invoiceDate)}
                </div>
                <div>
                  <span className="font-medium">{t('dueDate')}:</span> {formatDate(data.dueDate)}
                </div>
                <div>
                  <span className="font-medium">{t('paymentTerms')}:</span> {data.paymentTerms}
                </div>
                {data.customerOrderNumber && (
                  <div>
                    <span className="font-medium">{t('reference')}:</span> {data.customerOrderNumber}
                  </div>
                )}
              </div>

              {/* QR-Code unter Dokumentdetails */}
              {documentSettings?.showQRCode && documentSettings?.qrCodeUrl && (
                <div className="mt-3">
                  <img
                    src={documentSettings.qrCodeUrl}
                    alt="QR Code"
                    className="w-12 h-12 border border-gray-300 rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Betreff - Nur bei Stornorechnungen */}
          {detectedType === 'cancellation' && data.title && (
            <div className="mb-6">
              <div className="font-semibold text-sm text-gray-600 mb-1">Betreff:</div>
              <div className="font-medium text-base text-gray-900">{data.title}</div>
            </div>
          )}

          {/* Kopftext / Einleitung - Nur EIN Text anzeigen (processedHeadTextHtml hat Priorität) */}
          {(data.processedHeadTextHtml || data.processedHeaderText) && (
            <div className="mb-4">
              <div
                className="text-sm text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: data.processedHeadTextHtml || data.processedHeaderText,
                }}
              />
            </div>
          )}

          <div className="flex items-center justify-center mb-6">
            <div className="h-px flex-1 bg-linear-to-r from-transparent via-gray-300 to-transparent" />
            <div className="mx-4">
              <div className="w-3 h-3 rounded-full dynamic-accent" />
            </div>
            <div className="h-px flex-1 bg-linear-to-r from-transparent via-gray-300 to-transparent" />
          </div>
        </div>

        {/* Items Table Seite 1 */}
        <div className="px-6 flex-1">
          <ItemsTable
            data={data}
            color={color}
            variant="dynamic"
            showArticleNumber={documentSettings?.showArticleNumber}
            showVATPerPosition={documentSettings?.showVATPerPosition}
            language={documentSettings?.language || 'de'}
          />

          {/* Totals und Footer wenn keine zweite Seite benötigt wird */}
          {!needsSecondPage && (
            <>
              {/* Totals */}
              <div className="flex justify-between items-start gap-8 mb-8 mt-8">
                <div className="flex-1 space-y-4">
                  <TaxRulesInfo
                    data={data}
                    color={color}
                    language={documentSettings?.language || 'de'}
                  />
                </div>
                <TotalsDisplay
                  data={data}
                  color={color}
                  variant="standard"
                  language={documentSettings?.language || 'de'}
                />
              </div>

              {/* FooterText */}
              <FooterText data={data} language={data.language || 'de'} variant="standard" />

              {/* EPC-QR-Code */}
              {documentSettings?.epcQrCodeUrl && (
                <div className="mt-2">
                  <img
                    src={documentSettings.epcQrCodeUrl}
                    alt="EPC-QR-Code"
                    className="w-12 h-12"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* FOOTER SEITE 1 */}
        {documentSettings?.showFooter !== false && (
          <div className="bg-white p-2 mt-4">
            <SimpleFooter 
              data={data} 
              color={color}
              showPageNumbers={documentSettings?.showPageNumbers}
              currentPage={1}
              totalPages={needsSecondPage ? 2 : 1}
            />
          </div>
        )}
      </div>

      {/* ========= MEHRSEITIG MODUS - NUR WENN BENÖTIGT ========= */}
      {needsSecondPage && (
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
            className="flex flex-col dynamic-bg relative"
            style={{
              minHeight: '1123px',
              height: '1123px',
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

                  <div className="shrink-0">
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
                <div className="h-px flex-1 bg-linear-to-r from-transparent via-gray-300 to-transparent" />
                <div className="mx-4">
                  <div className="w-3 h-3 rounded-full dynamic-accent" />
                </div>
                <div className="h-px flex-1 bg-linear-to-r from-transparent via-gray-300 to-transparent" />
              </div>
            </div>

            {/* Fortsetzung + Totals Seite 2 */}
            <div className="px-6 flex-1 relative z-10">
              {/* Betreff - Nur bei Stornorechnungen (Seite 2) */}
              {detectedType === 'cancellation' && data.title && (
                <div className="mb-6">
                  <div className="font-semibold text-sm text-gray-600 mb-1">Betreff:</div>
                  <div className="font-medium text-base text-gray-900">{data.title}</div>
                </div>
              )}

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
                    <TaxRulesInfo
                      data={data}
                      color={color}
                      language={documentSettings?.language || 'de'}
                    />
                  </div>
                </div>
                <TotalsDisplay
                  data={data}
                  color={color}
                  variant="standard"
                  language={documentSettings?.language || 'de'}
                />
              </div>

              <FooterText data={data} language={data.language || 'de'} variant="standard" />

              {/* EPC-QR-Code */}
              {documentSettings?.epcQrCodeUrl && (
                <div className="mt-2">
                  <img
                    src={documentSettings.epcQrCodeUrl}
                    alt="EPC-QR-Code"
                    className="w-12 h-12"
                  />
                </div>
              )}

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
            {documentSettings?.showFooter !== false && (
              <div className="bg-white p-2 mt-3 relative z-10">
                <SimpleFooter 
                  data={data} 
                  color={color}
                  showPageNumbers={documentSettings?.showPageNumbers}
                  currentPage={2}
                  totalPages={2}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
