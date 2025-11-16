import React from 'react';
import { formatDate } from '@/lib/utils';
import { ProcessedPDFData } from '@/hooks/pdf/usePDFTemplateData';
import { TaxRulesInfo } from './common/TaxRulesInfo';
import { TotalsDisplay } from './common/TotalsDisplay';
import { ItemsTable } from './common/ItemsTable';
import { useDocumentTranslation } from '@/hooks/pdf/useDocumentTranslation';

import { FooterText } from './common/FooterText';
import { PDFSection } from './common/PDFSection';
import { SimpleFooter } from './common/SimpleFooter';
import type { DocumentType } from '@/lib/document-utils';
import { getTranslatedDocumentTypeConfig, detectDocumentType } from '@/lib/document-utils';
import { DocumentSettings } from '@/hooks/pdf/usePDFTemplateData';
import { replacePlaceholders } from '@/utils/placeholderSystem';

interface StandardTemplateProps {
  data: ProcessedPDFData;
  color: string;
  logoSize: number;
  pageMode?: 'single' | 'multi';
  documentType?: DocumentType;
  documentSettings?: DocumentSettings;
}

export const StandardTemplate: React.FC<StandardTemplateProps> = ({
  data,
  color,
  logoSize,
  pageMode = 'multi',
  documentType,
  documentSettings,
}) => {
  // 🌍 ÜBERSETZUNGSSYSTEM
  const { t } = useDocumentTranslation(documentSettings?.language || 'de');

  // 📋 DYNAMISCHE DOKUMENTTYP-KONFIGURATION
  // PRIORITÄT: Explizit übergebener documentType hat höchste Priorität
  const detectedType = documentType || detectDocumentType(data) || 'invoice';
  const config = getTranslatedDocumentTypeConfig(detectedType, t, color);

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
      className="bg-white w-full max-w-[210mm] mx-auto text-xs"
      style={{
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <style
        dangerouslySetInnerHTML={{
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
        `,
        }}
      />

      {/* ========= SEITE 1 ========= */}
      <div className="pdf-page flex flex-col relative">
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
          <div className="absolute bottom-4 right-6 text-xs text-gray-500 z-10">{t('page')} 1</div>
        )}
        {/* HEADER SEITE 1 */}
        <div className="p-6 pb-4">
          <div className="relative mb-4">
            <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: color }} />
            <div
              className="pt-6 flex justify-between items-start"
              style={{ minHeight: data.companyLogo ? '160px' : '80px' }}
            >
              <div className="text-left shrink-0">
                <div className="text-2xl font-bold mb-2">{config.title}</div>
              </div>

              <div className="flex-1 flex justify-end items-start">
                {/* Logo */}
                <div
                  className={data.companyLogo ? 'mb-4' : ''}
                  style={{
                    height: data.companyLogo ? '100px' : '0px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {data.companyLogo && (
                    <img
                      src={data.companyLogo}
                      alt="Logo"
                      style={{
                        height: `${Math.max(logoSize * 1.2, 50)}px`,
                        maxHeight: '100px',
                        width: 'auto',
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <div className="font-semibold mb-2">{config.recipientLabel}:</div>
              <div className="font-medium">{data.customerName}</div>
              <div className="text-gray-600 mt-1">
                <div>{data.customerAddressParsed.street}</div>
                <div>
                  {data.customerAddressParsed.postalCode} {data.customerAddressParsed.city}
                </div>
                <div>{data.customerAddressParsed.country}</div>
              </div>
              {data.customerVatId && (
                <div className="text-gray-600 mt-1">USt-IdNr.: {data.customerVatId}</div>
              )}
              {/* Kundennummer basierend auf documentSettings */}
              {documentSettings?.showCustomerNumber && data.customerNumber && (
                <div className="text-gray-600 mt-1">
                  {t('customerNumber')}: {data.customerNumber}
                </div>
              )}
              {/* Kontaktperson basierend auf documentSettings */}
              {documentSettings?.showContactPerson && data.contactPersonName && (
                <div className="text-gray-600 mt-1">
                  {t('contact')}: {data.contactPersonName}
                </div>
              )}
            </div>

            <div>
              <div className="font-semibold mb-2">{t('documentDetails')}:</div>
              <div className="space-y-1">
                <div>
                  {config.numberLabel}: {data.invoiceNumber}
                </div>
                <div>
                  {config.dateLabel}: {formatDate(data.invoiceDate)}
                </div>
                {config.showDueDate && data.dueDate && (
                  <div>
                    {config.dueDateLabel}: {formatDate(data.dueDate)}
                  </div>
                )}
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
              className="mb-6 p-4 bg-gray-50 rounded-lg border-l-4"
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

          <div className="border-t-2 mb-4" style={{ borderColor: color }}></div>
        </div>

        {/* Items Table Seite 1 */}
        <div className="px-6 flex-1 relative z-10">
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
              <FooterText data={data} variant="standard" language={data.language || 'de'} />

              {/* EPC-QR-Code NACH dem FooterText */}
              {documentSettings?.showEPCQRCode && (
                <div className="mt-4 p-2 border-t border-gray-200">
                  <div>
                    {documentSettings?.epcQrCodeUrl ? (
                      <img
                        src={documentSettings.epcQrCodeUrl}
                        alt="EPC QR Code (Girocode)"
                        className="w-12 h-12 border border-gray-300"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 border border-gray-300 flex items-center justify-center text-xs text-gray-500">
                        EPC
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* FOOTER SEITE 1 */}
        <div className="bg-white p-2 mt-4">
          {documentSettings?.showFooter !== false && <SimpleFooter data={data} color={color} />}
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
            className="flex flex-col no-page-break"
            style={{
              minHeight: '297mm',
              height: '297mm',
              pageBreakAfter: 'avoid',
              breakAfter: 'avoid',
            }}
          >
            {/* HEADER SEITE 2 */}
            <div className="p-6 pb-4">
              <div className="relative mb-4">
                <div
                  className="absolute top-0 left-0 w-full h-2"
                  style={{ backgroundColor: color }}
                />

                <div
                  className="pt-6 flex justify-between items-start"
                  style={{ minHeight: data.companyLogo ? '160px' : '80px' }}
                >
                  <div className="text-left shrink-0">
                    <div className="text-2xl font-bold mb-2">{data.documentLabel}</div>
                  </div>

                  <div className="flex-1 flex justify-end">
                    <div
                      className={data.companyLogo ? 'mb-4' : ''}
                      style={{
                        height: data.companyLogo ? '100px' : '0px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {data.companyLogo && (
                        <img
                          src={data.companyLogo}
                          alt="Logo"
                          style={{
                            height: `${Math.max(logoSize * 1.2, 50)}px`,
                            maxHeight: '100px',
                            width: 'auto',
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Empfänger und Details auch auf Seite 2 */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <div className="font-semibold mb-2">{config.recipientLabel}:</div>
                  <div className="font-medium">{data.customerName}</div>
                  <div className="text-gray-600 mt-1">
                    <div>{data.customerAddressParsed.street}</div>
                    <div>
                      {data.customerAddressParsed.postalCode} {data.customerAddressParsed.city}
                    </div>
                    <div>{data.customerAddressParsed.country}</div>
                  </div>
                  {data.customerVatId && (
                    <div className="text-gray-600 mt-1">USt-IdNr.: {data.customerVatId}</div>
                  )}
                </div>

                <div>
                  <div className="font-semibold mb-2">{t('documentDetails')}:</div>
                  <div className="space-y-1">
                    <div>
                      {config.numberLabel}: {data.invoiceNumber}
                    </div>
                    <div>
                      {config.dateLabel}: {formatDate(data.invoiceDate)}
                    </div>
                    {config.showDueDate && data.dueDate && (
                      <div>
                        {config.dueDateLabel}: {formatDate(data.dueDate)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t-2 mb-4" style={{ borderColor: color }}></div>
            </div>

            {/* WEITERFÜHRENDE TABELLE + TOTALS + FOOTERTEXT */}
            <div className="px-6 flex-1">
              {/* Betreff - Nur bei Stornorechnungen (Seite 2) */}
              {detectedType === 'cancellation' && data.title && (
                <div className="mb-6">
                  <div className="font-semibold text-sm text-gray-600 mb-1">Betreff:</div>
                  <div className="font-medium text-base text-gray-900">{data.title}</div>
                </div>
              )}

              {/* Fortsetzung Tabelle falls nötig - für Test sichtbarer Inhalt */}
              <div className="mb-8">
                <div className="text-sm font-semibold mb-2">Fortsetzung - Seite 2</div>
                <div className="text-xs text-gray-600 mb-4">
                  Weitere Details und Zusammenfassung
                </div>
              </div>

              {/* TOTALS */}
              <div className="flex justify-between items-start gap-8 mb-8">
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

              <FooterText data={data} variant="standard" language={data.language || 'de'} />

              {/* EPC-QR-Code NACH dem FooterText (Seite 2) */}
              {documentSettings?.showEPCQRCode && (
                <div className="mt-4 p-2 border-t border-gray-200">
                  <div>
                    {documentSettings?.epcQrCodeUrl ? (
                      <img
                        src={documentSettings.epcQrCodeUrl}
                        alt="EPC QR Code (Girocode)"
                        className="w-12 h-12 border border-gray-300"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 border border-gray-300 flex items-center justify-center text-xs text-gray-500">
                        EPC
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER SEITE 2 */}
            <div className="bg-white p-2 mt-3">
              <SimpleFooter data={data} color={color} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
