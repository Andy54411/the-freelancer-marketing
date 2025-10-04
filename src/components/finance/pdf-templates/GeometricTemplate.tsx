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
import { replacePlaceholders } from '@/utils/placeholderSystem';

interface GeometricTemplateProps {
  data: ProcessedPDFData;
  color: string;
  logoSize: number;
  pageMode?: 'single' | 'multi';
  documentType?: DocumentType;
  documentSettings?: DocumentSettings;
}

export const GeometricTemplate: React.FC<GeometricTemplateProps> = ({
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
  const config = getDocumentTypeConfig(detectedType, color);

  // Übersetzungsfunktion
  const { t } = useDocumentTranslation(documentSettings?.language || 'de');

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
        `,
        }}
      />

      {/* ========= SEITE 1 ========= */}
      <div className="pdf-page flex flex-col relative" style={{ minHeight: '297mm' }}>
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

            <div>
              <div className="font-semibold mb-3" style={{ color }}>
                {t('documentDetails')}
              </div>
              <div className="space-y-2">
                <div>
                  {config.numberLabel}: {data.invoiceNumber}
                </div>
                <div>
                  {t('date')}: {formatDate(data.invoiceDate)}
                </div>
                <div>
                  {t('dueDate')}: {formatDate(data.dueDate)}
                </div>
                <div>
                  {t('paymentTerms')}: {data.paymentTerms}
                </div>
              </div>

              {/* QR-Code unter Dokumentdetails */}
              {documentSettings?.showQRCode && (
                <div className="mt-4">
                  {documentSettings?.qrCodeUrl ? (
                    <img
                      src={documentSettings.qrCodeUrl}
                      alt="QR Code"
                      className="w-20 h-20 border border-gray-300"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-200 border border-gray-300 flex items-center justify-center text-xs text-gray-500">
                      QR
                    </div>
                  )}
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

          {/* Header Text (Kopftext) */}
          {data.processedHeaderText && (
            <div
              className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-white border-l-4 rounded-r"
              style={{ borderColor: color }}
            >
              <div className="font-medium text-sm mb-2" style={{ color }}>
                Kopftext
              </div>
              <div
                className="text-sm text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: data.processedHeaderText,
                }}
              />
            </div>
          )}

          {/* Head Text / Einleitung (processedHeadTextHtml) */}
          {data.processedHeadTextHtml && (
            <div className="mb-4">
              <div
                className="text-sm text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: data.processedHeadTextHtml,
                }}
              />
            </div>
          )}
        </div>

        {/* Items Section Seite 1 */}
        <div className="px-6 flex-1">
          <ItemsTable
            data={data}
            color={color}
            variant="standard"
            showArticleNumber={documentSettings?.showArticleNumber}
            showVATPerPosition={documentSettings?.showVATPerPosition}
            language={documentSettings?.language || 'de'}
          />

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

              {/* FooterText */}
              <div className="mb-4">
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
              </div>
            </>
          )}
        </div>

        {/* Footer Seite 1 */}
        {documentSettings?.showFooter !== false && (
          <div className="bg-white p-2 mt-4">
            <SimpleFooter data={data} color={color} />
          </div>
        )}
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
            className="flex flex-col relative"
            style={{
              minHeight: '297mm',
              height: '297mm',
              pageBreakAfter: 'avoid',
              breakAfter: 'avoid',
            }}
          >
            {/* Seitenzahl Seite 2 */}
            {documentSettings?.showPageNumbers && (
              <div className="absolute bottom-4 right-6 text-xs text-gray-500 z-10">Seite 2</div>
            )}
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
                    className="p-4 border-l-4 bg-gradient-to-r from-blue-50 to-white"
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
            </div>

            {/* Footer Seite 2 */}
            {documentSettings?.showFooter !== false && (
              <div className="bg-white p-2 mt-3">
                <SimpleFooter data={data} color={color} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
