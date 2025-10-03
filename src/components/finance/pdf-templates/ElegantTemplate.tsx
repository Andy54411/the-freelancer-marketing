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
import { replacePlaceholders } from '@/utils/placeholderSystem';
import { useDocumentTranslation } from '@/hooks/pdf/useDocumentTranslation';

interface ElegantTemplateProps {
  data: ProcessedPDFData;
  color: string;
  logoSize: number;
  pageMode?: 'single' | 'multi';
  documentType?: DocumentType;
  documentSettings?: DocumentSettings;
}

export const ElegantTemplate: React.FC<ElegantTemplateProps> = ({
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
        fontFamily: 'Georgia, serif',
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
        {/* Wasserzeichen */}
        {documentSettings?.showWatermark && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <div className="text-6xl font-bold text-gray-100 transform rotate-45 select-none">
              {data.documentLabel}
            </div>
          </div>
        )}
        {/* Seitenzahl */}
        {documentSettings?.showPageNumbers && (
          <div className="absolute bottom-4 right-6 text-xs text-gray-500 z-10">Seite 1</div>
        )}
        {/* Elegant Header - Redesigned */}
        <div className="p-4 pb-2">
          <div className="relative mb-3" style={{ minHeight: data.companyLogo ? '90px' : '75px' }}>
            {/* Elegant top gradient line */}
            <div
              className="absolute top-0 left-0 w-full h-0.5"
              style={{
                background: `linear-gradient(90deg, ${color} 0%, ${color}80 50%, transparent 100%)`,
              }}
            />

            <div className="flex justify-between items-start pt-4">
              {/* Logo Section */}
              <div className="flex-shrink-0">
                {data.companyLogo && (
                  <div className="relative">
                    <img
                      src={data.companyLogo}
                      alt={data.companyName}
                      className="h-16 w-auto object-contain"
                      style={{ maxHeight: `${logoSize}px` }}
                    />
                  </div>
                )}
              </div>

              {/* Company Info Section */}
              <div className="text-right max-w-xs">
                <div className="mb-3">
                  <div className="font-serif text-2xl font-normal tracking-wide text-gray-800 mb-1">
                    {data.companyName}
                  </div>
                  <div
                    className="w-16 h-px ml-auto"
                    style={{ backgroundColor: color, opacity: 0.6 }}
                  />
                </div>

                <div className="text-xs text-gray-600 space-y-0.5 leading-relaxed">
                  {data.companyAddress && (
                    <div
                      className="font-light"
                      dangerouslySetInnerHTML={{
                        __html: data.companyAddress.replace(/\n/g, '<br/>'),
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Document Label - Positioned elegantly */}
            <div className="absolute bottom-0 left-0 flex items-end">
              <div>
                <div
                  className="font-serif text-2xl font-light tracking-wider"
                  style={{ color: config.color }}
                >
                  {config.title}
                </div>
                <div className="flex items-center mt-1">
                  <div className="w-12 h-px" style={{ backgroundColor: color }} />
                  <div
                    className="w-1.5 h-1.5 rounded-full ml-2"
                    style={{ backgroundColor: color }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 mb-8">
            <div>
              <div className="font-light text-lg mb-4" style={{ color }}>
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
                  <div className="mt-2 text-sm">{t('vatId')}: {data.customerVatId}</div>
                )}
              </div>
            </div>

            <div>
              <div className="font-light text-lg mb-4" style={{ color }}>
                {t('documentDetails')}
              </div>
              <div className="space-y-1">
                <div>Nr. {data.invoiceNumber}</div>
                <div>{t('date')}: {formatDate(data.invoiceDate)}</div>
                <div>{t('dueDate')}: {formatDate(data.dueDate)}</div>
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

          {/* Header Text (Kopftext) */}
          {data.processedHeaderText && (
            <div
              className="mb-2 p-2 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border-l-4"
              style={{ borderColor: color }}
            >
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

          <div className="flex items-center mb-4">
            <div className="flex-1 h-px" style={{ backgroundColor: color, opacity: 0.3 }} />
            <div className="mx-4">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            </div>
            <div className="flex-1 h-px" style={{ backgroundColor: color, opacity: 0.3 }} />
          </div>
        </div>

        {/* Items Table Seite 1 */}
        <div className="px-4 flex-1">
          <ItemsTable
            data={data}
            color={color}
            variant="elegant"
            showArticleNumber={documentSettings?.showArticleNumber}
            showVATPerPosition={documentSettings?.showVATPerPosition}
            language={documentSettings?.language || 'de'}
          />

          {/* Totals und Footer NUR bei einseitigem Modus */}
          {pageMode === 'single' && (
            <>
              {/* Totals */}
              <div className="flex justify-between items-start gap-6 mb-4 mt-4">
                <div className="flex-1">
                  <div className="bg-gray-50 p-3 rounded border-l-4" style={{ borderColor: color }}>
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
                  variant="elegant"
                  language={documentSettings?.language || 'de'}
                />
              </div>

              {/* FooterText */}
              <FooterText data={data} language={data.language || 'de'} variant="elegant" />

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
            className="pdf-page flex flex-col relative"
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
                <div
                  className="absolute top-0 left-0 w-full h-1"
                  style={{ background: `linear-gradient(90deg, ${color} 0%, transparent 100%)` }}
                />

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

                        <div
                          className="absolute -bottom-2 left-0 w-16 h-0.5"
                          style={{ backgroundColor: color }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="font-light text-2xl text-gray-900 mb-2">{data.companyName}</div>
                    <div className="text-xs text-gray-600 leading-relaxed space-y-1">
                      {data.companyAddress && (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: data.companyAddress.replace(/\n/g, '<br/>'),
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0">
                  <div className="font-light text-3xl" style={{ color }}>
                    {data.documentLabel}
                  </div>
                  <div className="w-20 h-0.5 mt-1" style={{ backgroundColor: color }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-12 mb-8">
                <div>
                  <div className="font-light text-lg mb-4" style={{ color }}>
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
                  <div className="font-light text-lg mb-4" style={{ color }}>
                    Rechnungsdetails
                  </div>
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
                <div className="text-xs text-gray-600 mb-4">
                  Weitere Details und Zusammenfassung
                </div>
              </div>

              <div className="flex justify-between items-start gap-8 mb-8">
                <div className="flex-1">
                  <div className="bg-gray-50 p-4 rounded border-l-4" style={{ borderColor: color }}>
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
                  variant="elegant"
                  language={documentSettings?.language || 'de'}
                />
              </div>

              <FooterText data={data} language={data.language || 'de'} variant="elegant" />

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

              {/* Spacer um Footer nach unten zu drücken */}
              <div className="flex-1"></div>
            </div>

            {/* Footer Seite 2 - UNTEN */}
            {documentSettings?.showFooter !== false && (
              <div className="mt-3 p-2 bg-white">
                <SimpleFooter data={data} color={color} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
